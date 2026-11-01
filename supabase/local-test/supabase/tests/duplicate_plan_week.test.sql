begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

-- Fixtures (as postgres): user A with a varying program PA (A1 5-day, A2, unscheduled AU)
-- and a second program PA2 (A3); user B with one week.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'dup-a@example.test'),
  ('00000000-0000-0000-0000-0000000000b1', 'dup-b@example.test');

insert into public.programs (id, user_id, name, status, block_set_mode) values
  ('10000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'A program', 'paused', 'varies_by_week'),
  ('10000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a1', 'A second program', 'paused', 'legacy_unconfigured'),
  ('10000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1', 'B program', 'paused', 'legacy_unconfigured');

create temp table fx as select ((statement_timestamp() at time zone 'UTC')::date + 30) as d;
grant select on fx to authenticated;

insert into public.plan_weeks (id, user_id, program_id, program_sequence, week_number, start_date, end_date, focus, tasks)
select v.id::uuid, v.uid::uuid, v.pid::uuid, v.seq, v.num, fx.d + v.s, fx.d + v.e, v.focus, v.tasks
from fx, (values
  ('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a1', 1, 1, 0,  4,  'A1', 'A1 tasks'),
  ('20000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a1', 2, 2, 7,  13, 'A2', null),
  ('20000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a2', 1, 3, 14, 20, 'A3', null),
  ('20000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-0000000000b1', 1, 1, 0,  6,  'B1', null)
) as v(id, uid, pid, seq, num, s, e, focus, tasks);

insert into public.plan_weeks (id, user_id, program_id, program_sequence, week_number, start_date, end_date, focus)
values ('20000000-0000-0000-0000-0000000000a9', '00000000-0000-0000-0000-0000000000a1',
  '10000000-0000-0000-0000-0000000000a1', 3, null, null, null, 'AU');

insert into public.todos (week_id, name, source, done, sort_order) values
  ('20000000-0000-0000-0000-0000000000a1', 'T-b', 'src', true, 2),
  ('20000000-0000-0000-0000-0000000000a1', 'T-a', null, false, 1),
  ('20000000-0000-0000-0000-0000000000a1', 'T-c', null, true, 3);

insert into public.plan_week_blocks (week_id, block_key, sort_order) values
  ('20000000-0000-0000-0000-0000000000a1', 'legato', 1),
  ('20000000-0000-0000-0000-0000000000a1', 'chromatic', 2),
  ('20000000-0000-0000-0000-0000000000a1', 'major_scales', 3);

insert into public.songs (id, user_id, name) values
  ('40000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'S1'),
  ('40000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a1', 'S2'),
  ('40000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000a1', 'S3');
insert into public.week_songs (week_id, song_id, sort_order) values
  ('20000000-0000-0000-0000-0000000000a1', '40000000-0000-0000-0000-0000000000a2', 1),
  ('20000000-0000-0000-0000-0000000000a1', '40000000-0000-0000-0000-0000000000a3', 2),
  ('20000000-0000-0000-0000-0000000000a1', '40000000-0000-0000-0000-0000000000a1', 3);

insert into public.sessions (id, user_id, session_date, week_id, total_minutes, comment)
select '30000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', fx.d + 1,
  '20000000-0000-0000-0000-0000000000a1', 25, 'practiced'
from fx;
insert into public.session_blocks (session_id, block_key, label, target_minutes, actual_minutes, done)
values ('30000000-0000-0000-0000-0000000000a1', 'legato', 'Legato', 15, 25, true);

create temp table dup (id uuid);
grant select, insert on dup to authenticated;

-- Function contract: SECURITY DEFINER, fixed search_path, authenticated-only execute.
select is((select prosecdef from pg_proc where oid = 'public.duplicate_plan_week(uuid)'::regprocedure), true,
  'duplicate_plan_week is SECURITY DEFINER');
select ok((select proconfig::text[] @> array['search_path=pg_catalog, public, pg_temp']
  from pg_proc where oid = 'public.duplicate_plan_week(uuid)'::regprocedure),
  'duplicate_plan_week has a fixed search_path');
select is(has_function_privilege('authenticated', 'public.duplicate_plan_week(uuid)', 'execute'), true,
  'authenticated can execute duplicate_plan_week');
select is(has_function_privilege('anon', 'public.duplicate_plan_week(uuid)', 'execute'), false,
  'anon cannot execute duplicate_plan_week');
select is((select count(*)::int from pg_proc p, aclexplode(p.proacl) acl
  where p.oid = 'public.duplicate_plan_week(uuid)'::regprocedure
    and acl.grantee = 0 and acl.privilege_type = 'EXECUTE'), 0,
  'PUBLIC has no execute grant on duplicate_plan_week');

set local role anon;
select throws_ok(
  $$select public.duplicate_plan_week('20000000-0000-0000-0000-0000000000a1')$$,
  '42501', null, 'anon call is denied');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

select lives_ok(
  $$insert into dup select public.duplicate_plan_week('20000000-0000-0000-0000-0000000000a1')$$,
  'owner can duplicate a scheduled week');
select isnt((select id from dup), null::uuid, 'duplicate_plan_week returns the new week id');

-- New week sits directly after A1 and later weeks (any program) shift by A1's 5-day duration.
select results_eq(
  $$select case when id = (select id from dup) then 'COPY' else focus end,
      week_number, start_date - (select d from fx), end_date - (select d from fx)
    from public.plan_weeks where week_number is not null order by week_number$$,
  $$select * from (values ('A1'::text, 1, 0, 4), ('COPY', 2, 5, 9), ('A2', 3, 12, 18), ('A3', 4, 19, 25)) v$$,
  'copy inserted after the source and later weeks shifted and renumbered');
select results_eq(
  $$select program_id, program_sequence, focus, tasks from public.plan_weeks where id = (select id from dup)$$,
  $$select '10000000-0000-0000-0000-0000000000a1'::uuid, 4, 'A1'::text, 'A1 tasks'::text$$,
  'copy keeps program, focus and tasks with the next program_sequence');
select results_eq(
  $$select week_number, start_date, end_date from public.plan_weeks where focus = 'AU'$$,
  $$select null::int, null::date, null::date$$,
  'unscheduled week stays unscheduled');

select results_eq(
  $$select name, source, done, sort_order from public.todos where week_id = (select id from dup) order by sort_order$$,
  $$select * from (values ('T-a'::text, null::text, false, 1), ('T-b', 'src', false, 2), ('T-c', null, false, 3)) v$$,
  'todos copied in the same order and all unticked');
select is((select count(*)::int from public.todos
  where week_id = '20000000-0000-0000-0000-0000000000a1' and done), 2,
  'source todos keep their done state');

select results_eq(
  $$select block_key, sort_order from public.plan_week_blocks where week_id = (select id from dup) order by sort_order$$,
  $$select * from (values ('legato'::text, 1), ('chromatic', 2), ('major_scales', 3)) v$$,
  'week block composition copied with order');

select results_eq(
  $$select song_id, sort_order from public.week_songs where week_id = (select id from dup) order by sort_order$$,
  $$select * from (values ('40000000-0000-0000-0000-0000000000a2'::uuid, 1),
    ('40000000-0000-0000-0000-0000000000a3'::uuid, 2), ('40000000-0000-0000-0000-0000000000a1'::uuid, 3)) v$$,
  'repertoire songs copied with order');

select is((select count(*)::int from public.sessions where week_id = (select id from dup)), 0,
  'sessions are not copied to the new week');
select is((select count(*)::int from public.sessions), 1, 'owner still has exactly one session');
select is((select count(*)::int from public.session_blocks), 1, 'session blocks are not copied');

-- Rejections leave the schedule unchanged.
create temp table before_snapshot as
  select id, week_number, start_date, end_date, program_sequence from public.plan_weeks;

select throws_ok(
  $$select public.duplicate_plan_week('20000000-0000-0000-0000-0000000000a9')$$,
  'P0001', 'Only scheduled plan weeks can be duplicated', 'unscheduled week is rejected');
select throws_ok(
  $$select public.duplicate_plan_week('20000000-0000-0000-0000-00000000ffff')$$,
  'P0001', 'Plan week not found', 'missing week is rejected');
select throws_ok(
  $$select public.duplicate_plan_week(null)$$,
  'P0001', 'Plan week not found', 'null week id is rejected');
select is_empty(
  $$select id, week_number, start_date, end_date, program_sequence from public.plan_weeks
    except select id, week_number, start_date, end_date, program_sequence from before_snapshot$$,
  'rejected duplicates leave the schedule unchanged');

-- Owner isolation: user B cannot duplicate A's week.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
select throws_ok(
  $$select public.duplicate_plan_week('20000000-0000-0000-0000-0000000000a1')$$,
  'P0001', 'Plan week not found', 'B cannot duplicate A week');
select is((select count(*)::int from public.plan_weeks where user_id = '00000000-0000-0000-0000-0000000000a1'), 0,
  'RLS hides A weeks from B');

-- Item 53: arpeggios is a visible, selectable built-in in Scales and Fretboard Geography.
select results_eq(
  $$select label, category_key, is_selectable, user_id, archived_at from public.block_templates where key = 'arpeggios'$$,
  $$select 'Arpeggios'::text, 'scales_fretboard'::text, true, null::uuid, null::timestamptz$$,
  'arpeggios is readable by an authenticated user as a selectable built-in');

reset role;
select is((select count(*)::int from public.plan_weeks where user_id = '00000000-0000-0000-0000-0000000000b1'), 1,
  'B schedule is unchanged');
select is((select count(*)::int from public.plan_weeks where user_id = '00000000-0000-0000-0000-0000000000a1'), 5,
  'A has only the one intended new week');

select is((select count(*)::int from public.block_templates where key = 'arpeggios'), 1,
  'exactly one arpeggios row exists');
select ok((select sort_order > all (select sort_order from public.block_templates
    where user_id is null and category_key = 'scales_fretboard' and key <> 'arpeggios')
  from public.block_templates where key = 'arpeggios'),
  'arpeggios sorts after the existing Scales and Fretboard built-ins');
select is((select count(*)::int from public.program_blocks where block_key = 'arpeggios'), 0,
  'arpeggios is not added to any program');

select * from finish();
rollback;
