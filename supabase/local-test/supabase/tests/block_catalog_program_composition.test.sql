begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'blocks-a@example.test'),
  ('00000000-0000-0000-0000-0000000000b1', 'blocks-b@example.test');

insert into public.programs (id, user_id, name, status) values
  ('10000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'A program', 'paused'),
  ('10000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a1', 'A second program', 'paused'),
  ('10000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1', 'B program', 'paused');

create temp table fx as select ((statement_timestamp() at time zone 'UTC')::date + 30) as d;
grant select on fx to authenticated;
insert into public.plan_weeks (id, user_id, program_id, program_sequence, week_number, start_date, end_date, focus)
select v.id::uuid, v.uid::uuid, v.pid::uuid, v.seq, v.num, fx.d + v.off, fx.d + v.off + 6, v.focus
from fx, (values
  ('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a1', 1, 1, 0, 'A1'),
  ('20000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a1', 2, 2, 7, 'A2'),
  ('20000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-0000000000b1', 1, 1, 0, 'B1')
) as v(id, uid, pid, seq, num, off, focus);

insert into public.sessions (id, user_id, session_date, total_minutes)
values ('30000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', current_date, 17);
insert into public.session_blocks (session_id, block_key, label, target_minutes, actual_minutes, done)
values ('30000000-0000-0000-0000-0000000000a1', 'warmup', 'Historical warmup snapshot', 10, 7, true);

update public.block_templates set archived_at = now() where key = 'songwriting';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select is((select block_set_mode from public.programs where id = '10000000-0000-0000-0000-0000000000a1'),
  'legacy_unconfigured', 'existing programs start unconfigured without invented memberships');

select is(
  (select count(*)::int from public.block_templates
   where user_id is null and is_selectable and archived_at is null),
  22,
  'selectable catalog listing excludes retired and archived entries');
select is((select count(*)::int from public.block_templates where key = 'warmup'), 1,
  'authenticated legacy lookup can still read the retained warmup template');
select is((select is_selectable from public.block_templates where key = 'warmup'), false,
  'legacy warmup remains explicitly unavailable for new selection');
select lives_ok($$select public.create_other_block('Finger taps')$$,
  'create_other_block returns a generated custom key');
select ok((select key like 'other_%' from public.block_templates
  where user_id = '00000000-0000-0000-0000-0000000000a1' and label = 'Finger taps'),
  'custom keys use the immutable generated-key namespace');
select is((select category_key from public.block_templates where label = 'Finger taps'), 'other',
  'custom blocks belong to Other');
select is((select target_minutes::int from public.block_templates where label = 'Finger taps'), null::int,
  'custom blocks have no target by default');
select is((select count(*)::int from public.block_templates
  where key = 'warmup' and is_selectable and archived_at is null), 0,
  'retired warmup is not included in selectable catalog results');
select is((select count(*)::int from public.session_blocks session_block
  join public.block_templates template on template.key = session_block.block_key
  where session_block.session_id = '30000000-0000-0000-0000-0000000000a1'
    and session_block.block_key = 'warmup' and template.key = 'warmup'), 1,
  'historical warmup session key resolves through the readable template');

select lives_ok(
  $$select public.set_program_block_mode('10000000-0000-0000-0000-0000000000a1', 'same_every_week', array['technique','rhythm'])$$,
  'legacy program can be configured with an explicit shared set');
select is(
  (select array_agg(membership.block_key order by membership.sort_order)
   from public.program_blocks membership
   where membership.program_id = '10000000-0000-0000-0000-0000000000a1'),
  array['technique','rhythm']::text[],
  'program block order follows caller order');
select throws_ok(
  $$select public.replace_program_blocks('10000000-0000-0000-0000-0000000000a1', array['warmup'])$$,
  '22023', 'Unknown, archived, or unavailable block key', 'retired warmup cannot be selected for a new program');
select throws_ok(
  $$select public.replace_program_blocks('10000000-0000-0000-0000-0000000000a1', array['technique','technique'])$$,
  '22023', 'Duplicate block keys are not allowed', 'duplicate keys are rejected');
select throws_ok(
  $$select public.replace_program_blocks('10000000-0000-0000-0000-0000000000a1', array['not_a_block'])$$,
  '22023', 'Unknown, archived, or unavailable block key', 'unknown keys are rejected');
select throws_ok(
  $$select public.replace_program_blocks('10000000-0000-0000-0000-0000000000a1', array['songwriting'])$$,
  '22023', 'Unknown, archived, or unavailable block key', 'archived keys are rejected');
select is((select count(*)::int from public.program_blocks where program_id = '10000000-0000-0000-0000-0000000000a1'),
  2, 'failed block replacement leaves the prior shared set unchanged');
select throws_ok(
  $$update public.programs set block_set_mode = 'legacy_unconfigured' where id = '10000000-0000-0000-0000-0000000000a1'$$,
  'P0001', 'Use set_program_block_mode to change block composition', 'clients cannot bypass mode transitions with direct updates');

select lives_ok(
  $$select public.set_program_block_mode('10000000-0000-0000-0000-0000000000a1', 'varies_by_week')$$,
  'same-to-varies transition succeeds without changing effective sets');
select is(
  (select count(*)::int from public.plan_week_blocks where week_id in (
    '20000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-0000000000a2')),
  4,
  'same-to-varies copies program blocks to every existing week');

create temp table schedule_before as
  select id, week_number, start_date, end_date from public.plan_weeks where user_id = '00000000-0000-0000-0000-0000000000a1';
grant select on schedule_before to authenticated;
select throws_ok(
  $$select public.insert_plan_week((select d + 14 from fx), (select d + 20 from fx),
    '10000000-0000-0000-0000-0000000000a1', 'Missing set', null,
    '20000000-0000-0000-0000-0000000000a1')$$,
  '22023', 'At least one block key is required', 'varying insert requires a non-empty block set');
select throws_ok(
  $$select public.insert_plan_week((select d + 14 from fx), (select d + 20 from fx),
    '10000000-0000-0000-0000-0000000000a1', null, null,
    '20000000-0000-0000-0000-0000000000a1', array['chromatic'])$$,
  '23502', null, 'varying insert failure after schedule shifting rolls back atomically');
select is_empty(
  $$select id, week_number, start_date, end_date from public.plan_weeks where user_id = '00000000-0000-0000-0000-0000000000a1'
    except select id, week_number, start_date, end_date from schedule_before$$,
  'failed varying insert rolls back all schedule changes');
select is_empty(
  $$select id, week_number, start_date, end_date from schedule_before
    except select id, week_number, start_date, end_date from public.plan_weeks where user_id = '00000000-0000-0000-0000-0000000000a1'$$,
  'failed varying insert preserves all existing weeks');

create temp table inserted_week as
select public.insert_plan_week((select d + 14 from fx), (select d + 20 from fx),
  '10000000-0000-0000-0000-0000000000a1', 'Varying', null,
  '20000000-0000-0000-0000-0000000000a1', array['chromatic','technique']) as id;
grant select on inserted_week to authenticated;
select is(
  (select array_agg(membership.block_key order by membership.sort_order)
   from public.plan_week_blocks membership
   where membership.week_id = (select id from inserted_week)),
  array['chromatic','technique']::text[],
  'varying insert atomically saves the ordered selected block list');

select lives_ok(
  $$select public.add_plan_week(p_start_date => (select d + 21 from fx), p_end_date => (select d + 27 from fx),
    p_program_id => '10000000-0000-0000-0000-0000000000a1', p_focus => 'Appended', p_tasks => null,
    p_block_keys => array['rhythm'])$$,
  'add_plan_week accepts the optional varying-week block list');
select is(
  (select count(*)::int from public.plan_week_blocks membership join public.plan_weeks week on week.id = membership.week_id
   where week.program_id = '10000000-0000-0000-0000-0000000000a1' and week.focus = 'Appended'),
  1,
  'add_plan_week persists the varying-week set');

insert into public.programs (id, user_id, name, status)
values ('10000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000a1', 'Varying target', 'paused');
select public.set_program_block_mode('10000000-0000-0000-0000-0000000000a3', 'varies_by_week', array['harmony']);
insert into public.programs (id, user_id, name, status)
values ('10000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a1', 'Empty varying program', 'paused');
select public.set_program_block_mode('10000000-0000-0000-0000-0000000000a4', 'varies_by_week', array['repertoire']);
select lives_ok(
  $$select public.set_program_block_mode('10000000-0000-0000-0000-0000000000a4', 'same_every_week')$$,
  'varies-to-same preserves the baseline set when the program has no weeks');
select is((select count(*)::int from public.program_blocks where program_id = '10000000-0000-0000-0000-0000000000a4'),
  1, 'no-week mode conversion retains the effective program set');
select lives_ok(
  $$select public.assign_plan_week_program((select id from inserted_week), '10000000-0000-0000-0000-0000000000a3')$$,
  'reassigning a week to a varying program succeeds');
select is(
  (select array_agg(membership.block_key order by membership.sort_order)
   from public.plan_week_blocks membership
   where membership.week_id = (select id from inserted_week)),
  array['chromatic','technique']::text[],
  'reassignment to a varying program preserves the week effective set');

select public.replace_plan_week_blocks('20000000-0000-0000-0000-0000000000a2', array['harmony']);
select throws_ok(
  $$select public.set_program_block_mode('10000000-0000-0000-0000-0000000000a1', 'same_every_week')$$,
  'P0001', 'Week block sets differ; provide p_shared_block_keys to use a shared set',
  'varies-to-same requires an explicit shared set when week sets differ');
select is((select block_set_mode from public.programs where id = '10000000-0000-0000-0000-0000000000a1'),
  'varies_by_week', 'failed mode conversion leaves the program mode unchanged');
select is((select count(*)::int from public.plan_week_blocks where week_id in (
  '20000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-0000000000a2')),
  3, 'failed mode conversion preserves all per-week memberships');
select lives_ok(
  $$select public.set_program_block_mode('10000000-0000-0000-0000-0000000000a1', 'same_every_week', array['rhythm','technique'])$$,
  'varies-to-same accepts an explicit replacement shared set');
select is((select count(*)::int from public.plan_week_blocks where week_id in (
  '20000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-0000000000a2')),
  0, 'same-every-week transition removes redundant week overrides');
select is((select count(*)::int from public.program_blocks where program_id = '10000000-0000-0000-0000-0000000000a1'),
  2, 'same-every-week program retains its explicit shared set');

select lives_ok(
  $$select public.add_plan_week(p_start_date => (select d + 28 from fx), p_end_date => (select d + 34 from fx),
    p_program_id => '10000000-0000-0000-0000-0000000000a1', p_focus => 'Inherited', p_tasks => null)$$,
  'same-every-week add inherits the program composition');
select is((select count(*)::int from public.plan_week_blocks membership join public.plan_weeks week on week.id = membership.week_id
  where week.program_id = '10000000-0000-0000-0000-0000000000a1' and week.focus = 'Inherited'),
  0, 'same-every-week inheritance does not create per-week overrides');
select is((select count(*)::int from public.program_blocks where program_id = '10000000-0000-0000-0000-0000000000a1'),
  2, 'the inherited week resolves to the program shared set');

select throws_ok(
  $$select public.replace_plan_week_blocks('20000000-0000-0000-0000-0000000000b1', array['technique'])$$,
  'P0001', 'Varying-program week not found', 'caller cannot replace another owner week composition');
select throws_ok(
  $$select public.replace_program_blocks('10000000-0000-0000-0000-0000000000b1', array['technique'])$$,
  'P0001', 'Program not found', 'caller cannot replace another owner program composition');
select throws_ok(
  $$insert into public.program_blocks (program_id, block_key, sort_order)
    values ('10000000-0000-0000-0000-0000000000a1', 'technique', 99)$$,
  '42501', null, 'authenticated clients cannot write membership rows directly');

select is((select count(*)::int from public.session_blocks where session_id = '30000000-0000-0000-0000-0000000000a1'
  and block_key = 'warmup' and target_minutes = 10 and actual_minutes = 7 and done),
  1, 'session warmup snapshots remain unchanged');
select is((select total_minutes from public.sessions where id = '30000000-0000-0000-0000-0000000000a1'),
  17, 'historical session minutes remain unchanged');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
select is((select count(*)::int from public.block_templates where user_id is not null), 0,
  'catalog RLS hides another user custom blocks');
select is((select count(*)::int from public.program_blocks where program_id = '10000000-0000-0000-0000-0000000000a1'), 0,
  'program composition RLS hides another owner');
select is((select count(*)::int from public.plan_week_blocks where week_id = '20000000-0000-0000-0000-0000000000a1'), 0,
  'week composition RLS hides another owner');
select is((select count(*)::int from public.programs where id = '10000000-0000-0000-0000-0000000000a1'), 0,
  'program RLS hides another owner');
select throws_ok(
  $$select public.replace_program_blocks('10000000-0000-0000-0000-0000000000a1', array['technique'])$$,
  'P0001', 'Program not found', 'RPC ownership checks reject another user program');
select lives_ok($$select public.create_other_block('B only')$$, 'second user can create a personal Other block');
select is((select count(*)::int from public.block_templates where user_id = '00000000-0000-0000-0000-0000000000b1'),
  1, 'second user sees only their own custom block');

reset role;
select * from finish();
rollback;
