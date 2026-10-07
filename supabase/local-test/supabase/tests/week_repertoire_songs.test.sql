begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000c1', 'item40-a@example.test'),
  ('00000000-0000-0000-0000-0000000000d1', 'item40-b@example.test');

insert into public.programs (id, user_id, name, status) values
  ('10000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c1', 'Item 40 A', 'paused'),
  ('10000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000d1', 'Item 40 B', 'paused');

insert into public.plan_weeks (
  id, user_id, week_number, start_date, end_date, program_id, program_sequence, focus
) values
  ('20000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c1', 101,
    current_date + 60, current_date + 66, '10000000-0000-0000-0000-0000000000c1', 1, 'Historical week'),
  ('20000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000c1', 102,
    current_date + 67, current_date + 73, '10000000-0000-0000-0000-0000000000c1', 2, 'Reuse week'),
  ('20000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000d1', 101,
    current_date + 60, current_date + 66, '10000000-0000-0000-0000-0000000000d1', 1, 'Other owner week');

insert into public.songs (id, user_id, name) values
  ('40000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c1', 'Same name'),
  ('40000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000c1', 'Same name'),
  ('40000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000d1', 'Other owner song');

insert into public.week_songs (week_id, song_id, sort_order) values
  ('20000000-0000-0000-0000-0000000000c1', '40000000-0000-0000-0000-0000000000c1', 1),
  ('20000000-0000-0000-0000-0000000000c1', '40000000-0000-0000-0000-0000000000c2', 2),
  ('20000000-0000-0000-0000-0000000000c2', '40000000-0000-0000-0000-0000000000c1', 1),
  ('20000000-0000-0000-0000-0000000000d1', '40000000-0000-0000-0000-0000000000d1', 1);

select results_eq(
  $$select song_id, sort_order from public.week_songs
    where week_id = '20000000-0000-0000-0000-0000000000c1' order by sort_order$$,
  $$values
    ('40000000-0000-0000-0000-0000000000c1'::uuid, 1),
    ('40000000-0000-0000-0000-0000000000c2'::uuid, 2)$$,
  'existing historical links retain their stable order');
select is((select count(*)::int from public.plan_week_blocks
  where week_id = '20000000-0000-0000-0000-0000000000c1'), 0,
  'historical week remains without Repertoire block membership');
select is((select count(*)::int from public.program_blocks
  where program_id = '10000000-0000-0000-0000-0000000000c1'), 0,
  'historical program composition remains unchanged');
select is((select count(*)::int from public.songs
  where user_id = '00000000-0000-0000-0000-0000000000c1' and name = 'Same name'), 2,
  'same-name songs remain distinct rows');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);

select is((select count(*)::int from public.week_songs
  where week_id = '20000000-0000-0000-0000-0000000000c1'), 2,
  'authenticated owner can read preserved historical links');
select lives_ok(
  $$select public.replace_week_repertoire_songs(
    '20000000-0000-0000-0000-0000000000c2',
    array['40000000-0000-0000-0000-0000000000c2'::uuid, '40000000-0000-0000-0000-0000000000c1'::uuid])$$,
  'owner can atomically replace a week repertoire list');
select results_eq(
  $$select song_id, sort_order from public.week_songs
    where week_id = '20000000-0000-0000-0000-0000000000c2' order by sort_order$$,
  $$values
    ('40000000-0000-0000-0000-0000000000c2'::uuid, 1),
    ('40000000-0000-0000-0000-0000000000c1'::uuid, 2)$$,
  'association ordering follows the supplied ID order');
select lives_ok(
  $$select public.replace_week_repertoire_songs(
    '20000000-0000-0000-0000-0000000000c2',
    array['40000000-0000-0000-0000-0000000000c2'::uuid, '40000000-0000-0000-0000-0000000000c1'::uuid])$$,
  'replacing with the same list is repeatable');
select results_eq(
  $$select song_id, sort_order from public.week_songs
    where week_id = '20000000-0000-0000-0000-0000000000c2' order by sort_order$$,
  $$values
    ('40000000-0000-0000-0000-0000000000c2'::uuid, 1),
    ('40000000-0000-0000-0000-0000000000c1'::uuid, 2)$$,
  'repeated replacement keeps ordering stable');
select is((select count(*)::int from public.week_songs
  where week_id = '20000000-0000-0000-0000-0000000000c1'), 2,
  'replacing another week leaves historical links intact');
select is((select count(*)::int from public.week_songs
  where song_id = '40000000-0000-0000-0000-0000000000c1'), 2,
  'one song ID can be reused across weeks without merging other IDs');

select throws_ok(
  $$select public.replace_week_repertoire_songs(
    '20000000-0000-0000-0000-0000000000c2',
    array['40000000-0000-0000-0000-0000000000c1'::uuid, '40000000-0000-0000-0000-0000000000c1'::uuid])$$,
  '22023', 'Duplicate song IDs are not allowed', 'duplicate song IDs are rejected');
select throws_ok(
  $$select public.replace_week_repertoire_songs(
    '20000000-0000-0000-0000-0000000000c2',
    array['40000000-0000-0000-0000-0000000000d1'::uuid])$$,
  '22023', 'Song not found or not owned by user', 'songs owned by another user are rejected');
select is((select count(*)::int from public.week_songs
  where week_id = '20000000-0000-0000-0000-0000000000c2'), 2,
  'validation failures leave existing associations unchanged');

select throws_ok(
  $$insert into public.week_songs (week_id, song_id, sort_order)
    values ('20000000-0000-0000-0000-0000000000c2', '40000000-0000-0000-0000-0000000000c1', 3)$$,
  '42501', null, 'authenticated clients cannot insert membership rows directly');
select throws_ok(
  $$delete from public.week_songs where week_id = '20000000-0000-0000-0000-0000000000c2'$$,
  '42501', null, 'authenticated clients cannot delete membership rows directly');

reset role;
create function public.test_item40_repertoire_insert_failure()
returns trigger
language plpgsql
as $$
begin
  raise exception using errcode = 'P0001', message = 'Forced week song insert failure';
end;
$$;
create trigger test_item40_repertoire_insert_failure
  before insert on public.week_songs
  for each row execute function public.test_item40_repertoire_insert_failure();
set local role authenticated;

select throws_ok(
  $$select public.replace_week_repertoire_songs(
    '20000000-0000-0000-0000-0000000000c2',
    array['40000000-0000-0000-0000-0000000000c1'::uuid])$$,
  'P0001', 'Forced week song insert failure', 'failed insert aborts the replacement transaction');
reset role;
drop trigger test_item40_repertoire_insert_failure on public.week_songs;
drop function public.test_item40_repertoire_insert_failure();
set local role authenticated;
select results_eq(
  $$select song_id, sort_order from public.week_songs
    where week_id = '20000000-0000-0000-0000-0000000000c2' order by sort_order$$,
  $$values
    ('40000000-0000-0000-0000-0000000000c2'::uuid, 1),
    ('40000000-0000-0000-0000-0000000000c1'::uuid, 2)$$,
  'replacement failure rolls back its prior delete');

select lives_ok(
  $$select public.replace_week_repertoire_songs('20000000-0000-0000-0000-0000000000c1', array[]::uuid[])$$,
  'empty list unlinks songs from the selected week');
select is((select count(*)::int from public.week_songs
  where week_id = '20000000-0000-0000-0000-0000000000c1'), 0,
  'empty list removes only that week links');
select is((select count(*)::int from public.songs
  where id in ('40000000-0000-0000-0000-0000000000c1', '40000000-0000-0000-0000-0000000000c2')), 2,
  'unlinking never deletes song records');

select set_config('request.jwt.claims', '{"role":"authenticated"}', true);
select throws_ok(
  $$select public.replace_week_repertoire_songs('20000000-0000-0000-0000-0000000000c2', array[]::uuid[])$$,
  'P0001', 'Not authenticated', 'unauthenticated callers are rejected');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);
select is((select count(*)::int from public.week_songs
  where week_id = '20000000-0000-0000-0000-0000000000c2'), 0,
  'RLS hides another owner week-song associations');
select throws_ok(
  $$select public.replace_week_repertoire_songs('20000000-0000-0000-0000-0000000000c2', array[]::uuid[])$$,
  'P0001', 'Plan week not found', 'RPC rejects another owner week');

reset role;
select * from finish();
rollback;