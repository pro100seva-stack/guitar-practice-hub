-- Disposable local fixture only; all changes roll back. Requires the new migration.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

insert into auth.users(id, email) values
  ('00000000-0000-0000-0000-000000000911', 'practice-songs-a@example.test'),
  ('00000000-0000-0000-0000-000000000912', 'practice-songs-b@example.test');
insert into public.songs(id, user_id, name, notes, created_at) values
  ('40000000-0000-0000-0000-000000000911', '00000000-0000-0000-0000-000000000911', 'Legacy duplicate', 'Keep these notes', '2026-01-01'),
  ('40000000-0000-0000-0000-000000000913', '00000000-0000-0000-0000-000000000911', 'Legacy duplicate', null, '2026-01-02'),
  ('40000000-0000-0000-0000-000000000912', '00000000-0000-0000-0000-000000000912', 'Foreign song', null, '2026-01-01');

select has_column('public', 'songs', 'archived_at', 'songs support non-destructive archival');
select ok(not has_table_privilege('anon', 'public.practice_day_songs', 'SELECT'), 'anonymous clients cannot read daily selections');
select ok(not has_function_privilege('anon', 'public.create_practice_song(text,date,text)', 'EXECUTE'), 'anonymous clients cannot create songs through RPC');
select ok(not has_function_privilege('anon', 'public.set_practice_day_song(date,text,uuid,boolean)', 'EXECUTE'), 'anonymous clients cannot select songs');
select ok(not has_function_privilege('anon', 'public.archive_practice_song(uuid)', 'EXECUTE'), 'anonymous clients cannot archive songs');

set local role authenticated;
select set_config('request.jwt.claims', '{}', true);
select throws_ok($$select public.create_practice_song('No identity')$$,
  '42501', 'Not authenticated', 'creation requires an authenticated identity');
select throws_ok($$select public.set_practice_day_song(current_date, 'repertoire', '40000000-0000-0000-0000-000000000911', true)$$,
  '42501', 'Not authenticated', 'selection requires an authenticated identity');
select throws_ok($$select public.archive_practice_song('40000000-0000-0000-0000-000000000911')$$,
  '42501', 'Not authenticated', 'archival requires an authenticated identity');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000911","role":"authenticated"}', true);

select set_config('test.practice_song_id', public.create_practice_song(E' \tTest   Song\n ')::text, true);
select is((select name from public.songs where id = current_setting('test.practice_song_id')::uuid), 'Test Song', 'new song names are trimmed with collapsed whitespace');
select is(public.create_practice_song('test song'), current_setting('test.practice_song_id')::uuid, 'same owner reuses an active case-insensitive name');
select is(public.create_practice_song('  LEGACY   duplicate '), '40000000-0000-0000-0000-000000000911'::uuid, 'existing duplicates are reused deterministically');
select is((select count(*)::int from public.songs where name = 'Legacy duplicate'), 2, 'existing same-name rows are not merged or deleted');
select is((select notes from public.songs where id = '40000000-0000-0000-0000-000000000911'), 'Keep these notes', 'reusing a song preserves notes');
select is((select count(*)::int from public.practice_day_songs), 0, 'library-only creation does not select a day');
select is((select count(*)::int from public.plan_weeks), 0, 'creating a song requires no configured weeks');

select throws_ok($$select public.create_practice_song(E' \t\n')$$,
  '22023', 'Song name must contain 1 to 200 characters', 'blank names are rejected');
select throws_ok($$select public.create_practice_song(null)$$,
  '22023', 'Song name must contain 1 to 200 characters', 'null names are rejected');
select throws_ok($$select public.create_practice_song(repeat('x', 201))$$,
  '22023', 'Song name must contain 1 to 200 characters', 'overlong names are rejected');
select throws_ok($$select public.create_practice_song('Must not leak', current_date, null)$$,
  '22023', 'Provide a practice date and supported block together', 'half-specified day context is rejected');
select throws_ok($$select public.create_practice_song('Must not leak', null, 'repertoire')$$,
  '22023', 'Provide a practice date and supported block together', 'half-specified block context is rejected');
select throws_ok($$select public.create_practice_song('Must not leak', current_date, 'technique')$$,
  '22023', 'Provide a practice date and supported block together', 'unsupported song blocks are rejected before creation');
select is((select count(*)::int from public.songs where name = 'Must not leak'), 0, 'invalid combined creation leaves no orphan song');

select lives_ok($$select public.set_practice_day_song(current_date + 7, 'repertoire', current_setting('test.practice_song_id')::uuid, true)$$,
  'a song can be planned for a future day without a practice session');
select lives_ok($$select public.set_practice_day_song(current_date + 7, 'repertoire', current_setting('test.practice_song_id')::uuid, true)$$,
  'repeating selection is idempotent');
select lives_ok($$select public.set_practice_day_song(current_date + 7, 'learn_song', current_setting('test.practice_song_id')::uuid, true)$$,
  'the two allowed blocks have independent daily selections');
select is((select count(*)::int from public.practice_day_songs), 2, 'duplicate selection creates no duplicate association');
select is((select count(*)::int from public.sessions), 0, 'planning creates no practiced session or minutes');
select throws_ok($$select public.set_practice_day_song(current_date, 'repertoire', '40000000-0000-0000-0000-000000000912', true)$$,
  '42501', 'Song not found or not owned by user', 'another owner song cannot be selected');
select throws_ok($$select public.set_practice_day_song(null, 'repertoire', current_setting('test.practice_song_id')::uuid, true)$$,
  '22023', 'Invalid practice song selection', 'null dates are rejected');
select throws_ok($$select public.set_practice_day_song(current_date, 'technique', current_setting('test.practice_song_id')::uuid, true)$$,
  '22023', 'Invalid practice song selection', 'unsupported blocks are rejected');
select throws_ok($$select public.set_practice_day_song(current_date, 'repertoire', current_setting('test.practice_song_id')::uuid, null)$$,
  '22023', 'Invalid practice song selection', 'null selection state is rejected');
select throws_ok($$insert into public.practice_day_songs(practice_date, block_key, song_id) values (current_date, 'repertoire', current_setting('test.practice_song_id')::uuid)$$,
  '42501', null, 'direct inserts bypassing RPC validation are denied');
select throws_ok($$update public.practice_day_songs set practice_date = current_date$$,
  '42501', null, 'direct association updates are denied');
select throws_ok($$delete from public.practice_day_songs$$,
  '42501', null, 'direct association deletes are denied');

select set_config('test.atomic_song_id', public.create_practice_song('Created and selected', current_date + 8, 'learn_song')::text, true);
select is((select count(*)::int from public.practice_day_songs where song_id = current_setting('test.atomic_song_id')::uuid and practice_date = current_date + 8 and block_key = 'learn_song'),
  1, 'combined creation selects the new song in the same operation');
select lives_ok($$select public.archive_practice_song(current_setting('test.practice_song_id')::uuid)$$, 'an owned song can be archived');
select ok((select archived_at is not null from public.songs where id = current_setting('test.practice_song_id')::uuid), 'archival retains the song row');
select set_config('test.archive_time', (select archived_at::text from public.songs where id = current_setting('test.practice_song_id')::uuid), true);
select lives_ok($$select public.archive_practice_song(current_setting('test.practice_song_id')::uuid)$$, 'repeating archive is idempotent');
select is((select archived_at::text from public.songs where id = current_setting('test.practice_song_id')::uuid), current_setting('test.archive_time'), 'archive timestamp stays stable');
select is((select count(*)::int from public.practice_day_songs where song_id = current_setting('test.practice_song_id')::uuid), 2, 'archival retains existing daily references');
select throws_ok($$delete from public.songs where id = current_setting('test.practice_song_id')::uuid$$,
  '23503', null, 'selected-song references prevent hard deletion of the song');
select throws_ok($$select public.set_practice_day_song(current_date + 9, 'repertoire', current_setting('test.practice_song_id')::uuid, true)$$,
  '22023', 'Archived songs cannot be selected', 'archived songs cannot receive new daily selections');
select lives_ok($$select public.set_practice_day_song(current_date + 7, 'learn_song', current_setting('test.practice_song_id')::uuid, false)$$,
  'archived songs can still be removed from a day');
select lives_ok($$select public.set_practice_day_song(current_date + 7, 'learn_song', current_setting('test.practice_song_id')::uuid, false)$$,
  'repeating unselection is idempotent');
select is((select count(*)::int from public.practice_day_songs where song_id = current_setting('test.practice_song_id')::uuid and block_key = 'repertoire'), 1,
  'unselecting one block leaves the other block intact');
select isnt(public.create_practice_song('Test Song'), current_setting('test.practice_song_id')::uuid, 'creating the same name after archive creates a new active row');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000912","role":"authenticated"}', true);
select is((select count(*)::int from public.practice_day_songs), 0, 'daily RLS hides another owner selections');
select is((select count(*)::int from public.songs where id = current_setting('test.practice_song_id')::uuid), 0, 'song RLS hides another owner archived row');
select throws_ok($$select public.archive_practice_song(current_setting('test.practice_song_id')::uuid)$$,
  '42501', 'Song not found or not owned by user', 'another owner song cannot be archived');
select throws_ok($$select public.set_practice_day_song(current_date + 7, 'repertoire', current_setting('test.practice_song_id')::uuid, false)$$,
  '42501', 'Song not found or not owned by user', 'another owner selection cannot be removed');
select lives_ok($$select public.create_practice_song('Test Song', current_date, 'repertoire')$$, 'a second owner can independently use the same song name');
select is((select count(*)::int from public.practice_day_songs), 1, 'the second owner sees only their new daily selection');

reset role;
select is((select count(*)::int from public.sessions where user_id in ('00000000-0000-0000-0000-000000000911', '00000000-0000-0000-0000-000000000912')), 0,
  'song planning never creates practice history');
select * from finish();
rollback;
