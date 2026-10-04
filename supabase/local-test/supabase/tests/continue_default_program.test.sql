begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

create temp table fx as select
  (statement_timestamp() at time zone 'UTC')::date as today,
  date_trunc('week', (statement_timestamp() at time zone 'UTC')::date::timestamp)::date as monday;
grant select on fx to authenticated;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000c1', 'cont-due@example.test'),
  ('00000000-0000-0000-0000-0000000000c2', 'cont-notdue@example.test'),
  ('00000000-0000-0000-0000-0000000000c3', 'cont-overlap@example.test'),
  ('00000000-0000-0000-0000-0000000000c4', 'cont-inactive@example.test'),
  ('00000000-0000-0000-0000-0000000000c5', 'cont-paused@example.test'),
  ('00000000-0000-0000-0000-0000000000c6', 'cont-lang@example.test');

insert into public.programs (id, user_id, name, status, is_default, language) values
  ('30000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c1', 'Default', 'active', true, 'en'),
  ('30000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000c2', 'Default', 'active', true, 'en'),
  ('30000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000c3', 'Default', 'active', true, 'en'),
  ('30000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000c3', 'Other', 'paused', false, 'en'),
  ('30000000-0000-0000-0000-0000000000c5', '00000000-0000-0000-0000-0000000000c5', 'Default', 'paused', true, 'en'),
  ('30000000-0000-0000-0000-0000000000c6', '00000000-0000-0000-0000-0000000000c6', 'Default', 'active', true, 'en');

-- c1: latest default week ended before this Monday (due). c2: latest week covers today (not due).
-- c3: due, but another program's week overlaps the current Monday-Sunday. c6: due, language mismatch.
insert into public.plan_weeks (user_id, program_id, program_sequence, week_number, start_date, end_date, focus)
select v.uid::uuid, v.pid::uuid, v.seq, v.num, fx.monday + v.s, fx.monday + v.e, v.focus
from fx, (values
  ('00000000-0000-0000-0000-0000000000c1', '30000000-0000-0000-0000-0000000000c1', 1, 1, -14, -8,  'old'),
  ('00000000-0000-0000-0000-0000000000c2', '30000000-0000-0000-0000-0000000000c2', 1, 1, 0,   6,   'current'),
  ('00000000-0000-0000-0000-0000000000c3', '30000000-0000-0000-0000-0000000000c3', 1, 1, -21, -15, 'old'),
  ('00000000-0000-0000-0000-0000000000c3', '30000000-0000-0000-0000-0000000000d3', 1, 2, -3,  6,   'overlapping'),
  ('00000000-0000-0000-0000-0000000000c6', '30000000-0000-0000-0000-0000000000c6', 1, 1, -14, -8,  'old')
) as v(uid, pid, seq, num, s, e, focus);

set local role authenticated;

-- Due: inserts the current UTC Monday-Sunday week with rotated focus; repeating is not_due.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
select results_eq(
  $$select result, start_date - (select monday from fx), end_date - (select monday from fx)
    from public.continue_default_program('en', array['F1', 'F2'], 'tasks')$$,
  $$values ('inserted'::text, 0, 6)$$,
  'due: inserts current UTC Monday-Sunday');
select results_eq(
  $$select week_number, program_sequence, focus from public.plan_weeks where start_date = (select monday from fx)$$,
  $$values (2, 2, 'F2')$$,
  'due: next number/sequence and rotated focus');
select results_eq(
  $$select result from public.continue_default_program('en', array['F1', 'F2'], 'tasks')$$,
  $$values ('not_due'::text)$$,
  'same-week repeat returns not_due');
select is((select count(*)::int from public.plan_weeks), 2, 'same-week repeat inserts nothing');

-- Not due.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}', true);
select results_eq(
  $$select result, week_id from public.continue_default_program('en', array['F1'], null)$$,
  $$values ('not_due'::text, null::uuid)$$,
  'not_due when the latest default week has not ended');
select is((select count(*)::int from public.plan_weeks), 1, 'not_due does not mutate');

-- Overlap.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}', true);
select results_eq(
  $$select result from public.continue_default_program('en', array['F1'], null)$$,
  $$values ('overlap'::text)$$,
  'overlap with another scheduled week');
select is((select count(*)::int from public.plan_weeks), 2, 'overlap does not mutate');

-- Inactive: no program, and paused default program.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c4","role":"authenticated"}', true);
select results_eq(
  $$select result from public.continue_default_program('en', array['F1'], null)$$,
  $$values ('inactive'::text)$$,
  'inactive without a default program');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c5","role":"authenticated"}', true);
select results_eq(
  $$select result from public.continue_default_program('en', array['F1'], null)$$,
  $$values ('inactive'::text)$$,
  'inactive with a paused default program');

-- Language mismatch and validation.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c6","role":"authenticated"}', true);
select throws_ok(
  $$select * from public.continue_default_program('fr', array['F1'], null)$$,
  'P0001', 'Continuation language does not match the Default program language', 'language mismatch raises');
select is((select count(*)::int from public.plan_weeks), 1, 'language mismatch does not mutate');
select throws_ok(
  $$select * from public.continue_default_program('en', array[]::text[], null)$$,
  'P0001', 'At least one continuation focus is required', 'empty focuses raise');

-- Anonymous callers cannot execute it.
reset role;
set local role anon;
select throws_ok(
  $$select * from public.continue_default_program('en', array['F1'], null)$$,
  '42501', null, 'anon cannot execute continue_default_program');

select * from finish();
rollback;
