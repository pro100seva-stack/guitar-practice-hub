begin;
create extension if not exists pgtap with schema extensions;
select plan(21);

-- Fixtures (as postgres): user A with a paused program and 3 consecutive weeks; user B with 2 weeks.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'plan-a@example.test'),
  ('00000000-0000-0000-0000-0000000000b1', 'plan-b@example.test');

insert into public.programs (id, user_id, name, status) values
  ('10000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'A program', 'paused'),
  ('10000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1', 'B program', 'paused');

create temp table fx as select ((statement_timestamp() at time zone 'UTC')::date + 30) as d;
grant select on fx to authenticated;

insert into public.plan_weeks (id, user_id, program_id, program_sequence, week_number, start_date, end_date, focus)
select v.id::uuid, v.uid::uuid, v.pid::uuid, v.seq, v.num, fx.d + v.off, fx.d + v.off + 6, v.focus
from fx, (values
  ('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a1', 1, 1, 0,  'A1'),
  ('20000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a1', 2, 2, 7,  'A2'),
  ('20000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a1', 3, 3, 14, 'A3'),
  ('20000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-0000000000b1', 1, 1, 0,  'B1'),
  ('20000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-0000000000b1', 2, 2, 7,  'B2')
) as v(id, uid, pid, seq, num, off, focus);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

-- insert_plan_week after week 1 shifts later weeks by the inserted duration (7 days).
select lives_ok(
  $$select public.insert_plan_week((select d from fx) + 7, (select d from fx) + 13,
    '10000000-0000-0000-0000-0000000000a1', 'NEW', null, '20000000-0000-0000-0000-0000000000a1')$$,
  'insert_plan_week succeeds');
select results_eq(
  $$select focus, week_number, start_date - (select d from fx) from public.plan_weeks order by week_number$$,
  $$values ('A1'::text, 1, 0), ('NEW', 2, 7), ('A2', 3, 14), ('A3', 4, 21)$$,
  'insert_plan_week inserts at 2 and shifts later weeks and dates');

-- add_plan_week with insert-after (paused program, so pausing does not unschedule anything).
select lives_ok(
  $$select public.add_plan_week((select d from fx) + 21, (select d from fx) + 23,
    '10000000-0000-0000-0000-0000000000a1', 'SHORT', null, '20000000-0000-0000-0000-0000000000a2')$$,
  'add_plan_week with insert-after succeeds');
select results_eq(
  $$select focus, week_number, start_date - (select d from fx) from public.plan_weeks order by week_number$$,
  $$values ('A1'::text, 1, 0), ('NEW', 2, 7), ('A2', 3, 14), ('SHORT', 4, 21), ('A3', 5, 24)$$,
  'add_plan_week shifts later weeks by the 3-day duration');

-- add_plan_week without anchor appends.
select lives_ok(
  $$select public.add_plan_week((select d from fx) + 31, (select d from fx) + 37,
    '10000000-0000-0000-0000-0000000000a1', 'LAST', null)$$,
  'add_plan_week without anchor succeeds');
select is(
  (select week_number from public.plan_weeks where focus = 'LAST'), 6,
  'add_plan_week without anchor appends after the last week');

-- Rollback on forced error: NULL focus violates NOT NULL after the shift step.
create temp table before_snapshot as
  select id, week_number, start_date, end_date from public.plan_weeks;
grant select on before_snapshot to authenticated;

select throws_ok(
  $$select public.insert_plan_week((select d from fx) + 7, (select d from fx) + 13,
    '10000000-0000-0000-0000-0000000000a1', null, null, '20000000-0000-0000-0000-0000000000a1')$$,
  '23502', null, 'insert_plan_week with NULL focus fails');
select is_empty(
  $$select id, week_number, start_date, end_date from public.plan_weeks
    except select id, week_number, start_date, end_date from before_snapshot$$,
  'failed insert_plan_week leaves the schedule unchanged');
select throws_ok(
  $$select public.add_plan_week((select d from fx) + 7, (select d from fx) + 13,
    '10000000-0000-0000-0000-0000000000a1', null, null, '20000000-0000-0000-0000-0000000000a1')$$,
  '23502', null, 'add_plan_week with NULL focus fails');
select is_empty(
  $$select id, week_number, start_date, end_date from public.plan_weeks
    except select id, week_number, start_date, end_date from before_snapshot$$,
  'failed add_plan_week leaves the schedule unchanged');

-- remove_plan_week: remove the first week; later weeks shift back and renumber, next week returned.
select is(
  public.remove_plan_week('20000000-0000-0000-0000-0000000000a1'),
  (select id from public.plan_weeks where focus = 'NEW'),
  'remove_plan_week returns the week now numbered 1');
select results_eq(
  $$select focus, week_number, start_date - (select d from fx) from public.plan_weeks order by week_number$$,
  $$values ('NEW'::text, 1, 0), ('A2', 2, 7), ('SHORT', 3, 14), ('A3', 4, 17), ('LAST', 5, 24)$$,
  'remove_plan_week renumbers and closes the date gap');

-- Refuses removing the last scheduled week.
select public.remove_plan_week(id) from public.plan_weeks where focus in ('A2', 'SHORT', 'A3', 'LAST') order by week_number desc limit 4;
select is((select count(*)::int from public.plan_weeks where week_number is not null), 1,
  'one scheduled week remains');
select throws_ok(
  $$select public.remove_plan_week((select id from public.plan_weeks where week_number = 1))$$,
  'P0001', 'At least one plan week must remain', 'last scheduled week cannot be removed');

-- Owner isolation: user B cannot touch user A's week.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
select is((select count(*)::int from public.plan_weeks where user_id = '00000000-0000-0000-0000-0000000000a1'), 0,
  'RLS hides user A weeks from user B');
select throws_ok(
  $$select public.remove_plan_week('20000000-0000-0000-0000-0000000000a1')$$,
  'P0001', 'Plan week not found', 'B cannot remove A week');
select throws_ok(
  $$select public.insert_plan_week((select d from fx) + 7, (select d from fx) + 13,
    '10000000-0000-0000-0000-0000000000b1', 'X', null, '20000000-0000-0000-0000-0000000000a1')$$,
  'P0001', 'Plan week not found', 'B cannot insert after A week');
select throws_ok(
  $$select public.insert_plan_week((select d from fx) + 7, (select d from fx) + 13,
    '10000000-0000-0000-0000-0000000000a1', 'X', null, '20000000-0000-0000-0000-0000000000b1')$$,
  'P0001', 'Program not found', 'B cannot use A program');
select throws_ok(
  $$select public.add_plan_week((select d from fx) + 7, (select d from fx) + 13,
    '10000000-0000-0000-0000-0000000000a1', 'X', null)$$,
  'P0001', 'Program not found', 'B cannot add a week to A program');

reset role;
select is(
  (select count(*)::int from public.plan_weeks where user_id = '00000000-0000-0000-0000-0000000000b1' and week_number is not null), 2,
  'user B schedule is unchanged');
select is(
  (select count(*)::int from public.plan_weeks where user_id = '00000000-0000-0000-0000-0000000000a1' and week_number is not null), 1,
  'user A only has the intended remaining week');

select * from finish();
rollback;
