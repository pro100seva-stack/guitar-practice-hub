begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

lock table account_gateway_private.budgets in access exclusive mode;
do $$
begin
  if exists (select 1 from account_gateway_private.budgets) then
    raise exception 'Requires an exclusive isolated local database with empty limiter storage';
  end if;
end;
$$;

select ok((select relrowsecurity from pg_class where oid = 'account_gateway_private.budgets'::regclass), 'private budgets have RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.user_profiles'::regclass), 'credentials retain RLS');
select ok(not has_schema_privilege('anon', 'account_gateway_private', 'USAGE'), 'anon cannot use private schema');
select ok(not has_schema_privilege('authenticated', 'account_gateway_private', 'USAGE'), 'authenticated cannot use private schema');
select ok(not has_schema_privilege('service_role', 'account_gateway_private', 'USAGE'), 'service enters only through definer RPC');
select ok(not has_function_privilege('anon', 'public.consume_account_gateway_budget_v1(text,text)', 'EXECUTE'), 'anon cannot call limiter');
select ok(not has_function_privilege('authenticated', 'public.consume_account_gateway_budget_v1(text,text)', 'EXECUTE'), 'authenticated cannot call limiter');
select ok(has_function_privilege('service_role', 'public.consume_account_gateway_budget_v1(text,text)', 'EXECUTE'), 'service can call limiter');
select ok(not has_table_privilege('authenticated', 'public.user_profiles', 'SELECT,INSERT,UPDATE,DELETE'), 'no browser credential CRUD');
select ok(not has_table_privilege('anon', 'public.user_profiles', 'SELECT,INSERT,UPDATE,DELETE'), 'no anonymous credential CRUD');

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000be01', 'beta-security-a@example.test'),
  ('00000000-0000-0000-0000-00000000be02', 'beta-security-b@example.test');
insert into public.user_profiles (user_id, login_name, security_question, security_answer_hash) values
  ('00000000-0000-0000-0000-00000000be01', 'beta-security-a', 'Synthetic?', repeat('a', 64)),
  ('00000000-0000-0000-0000-00000000be02', 'beta-security-b', 'Synthetic?', repeat('b', 64));

set local role anon;
select throws_ok($$select public.consume_account_gateway_budget_v1(repeat('a',64),'reset-password')$$, '42501', null, 'actual anon RPC denied');
select throws_ok($$select * from account_gateway_private.budgets$$, '42501', null, 'actual anon storage denied');
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000be01","role":"authenticated"}', true);
select throws_ok($$select * from public.user_profiles$$, '42501', null, 'user A cannot read credentials');
select throws_ok($$update public.user_profiles set security_answer_hash = repeat('c',64)$$, '42501', null, 'user A cannot change credentials');
select throws_ok($$delete from public.user_profiles$$, '42501', null, 'user A cannot delete credentials');
select throws_ok($$insert into public.user_profiles(user_id,login_name,security_question,security_answer_hash)
  values(auth.uid(),'forged','Synthetic?',repeat('a',64))$$, '42501', null, 'user A cannot insert credentials');
select throws_ok($$select public.consume_account_gateway_budget_v1(repeat('a',64),'reset-password')$$, '42501', null, 'user A cannot call service RPC');
select throws_ok($$select * from account_gateway_private.budgets$$, '42501', null, 'user A cannot read budgets');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000be02","role":"authenticated"}', true);
select throws_ok($$select * from public.user_profiles$$, '42501', null, 'user B cannot read credentials');
select throws_ok($$update public.user_profiles set security_question = 'Forged?'$$, '42501', null, 'user B cannot change credentials');
select throws_ok($$delete from public.user_profiles$$, '42501', null, 'user B cannot delete credentials');
select throws_ok($$select public.consume_account_gateway_budget_v1(repeat('a',64),'reset-password')$$, '42501', null, 'user B cannot call service RPC');
reset role;
select throws_ok($$select public.consume_account_gateway_budget_v1(repeat('a',64),'reset-password')$$, '42501', 'Service role required', 'definer rejects nonservice claim even when SQL owner can execute');
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select throws_ok($$select public.consume_account_gateway_budget_v1('raw-login','reset-password')$$, '22023', 'Invalid budget arguments', 'raw login rejected');
select throws_ok($$select public.consume_account_gateway_budget_v1(null,'reset-password')$$, '22023', 'Invalid budget arguments', 'null hash rejected');
select throws_ok($$select public.consume_account_gateway_budget_v1(repeat('a',64),null)$$, '22023', 'Invalid budget arguments', 'null action rejected');
select throws_ok($$select public.consume_account_gateway_budget_v1(repeat('a',64),'invalid')$$, '22023', 'Invalid budget arguments', 'unknown action rejected');

set local role service_role;
select results_eq($$select * from public.consume_account_gateway_budget_v1(repeat('a',64),'reset-password')$$,
  $$select true,0$$, 'actual service role admission succeeds without private schema access');
reset role;
select results_eq($$select allowed from generate_series(1,4) as attempt
  cross join lateral public.consume_account_gateway_budget_v1(repeat('a',64),
    case when attempt > 0 then 'reset-password' end)$$,
  $$select true from generate_series(1,4)$$, 'five total admissions succeed');
create temporary table beta_security_before_denial as select * from account_gateway_private.budgets;
select results_eq($$select allowed from public.consume_account_gateway_budget_v1(repeat('a',64),'reset-password')$$,
  $$select false$$, 'sixth admission denied');
select ok((select retry_after_seconds between 1 and 900 from public.consume_account_gateway_budget_v1(repeat('a',64),'reset-password')), 'cooldown is positive bounded seconds');
select results_eq($$select * from account_gateway_private.budgets order by bucket_key$$,
  $$select * from beta_security_before_denial order by bucket_key$$, 'denials change neither timestamps nor expiry nor global debit');
select results_eq($$select * from public.consume_account_gateway_budget_v1(repeat('a',64),'get-recovery-question')$$,
  $$select true,0$$, 'another action has separate allowance');
select results_eq($$select allowed from public.consume_account_gateway_budget_v1(repeat('a',64),'reset-password')$$,
  $$select false$$, 'another action does not replenish reset');

update account_gateway_private.budgets set admitted_at = array[clock_timestamp() - interval '16 minutes'];
select results_eq($$select * from public.consume_account_gateway_budget_v1(repeat('a',64),'reset-password')$$,
  $$select true,0$$, 'rolling expired admissions no longer count');
select is((select cardinality(admitted_at) from account_gateway_private.budgets where bucket_key = repeat('a',64)||':reset-password'), 1, 'expired account timestamps pruned');
select ok((select expires_at > clock_timestamp() + interval '23 hours' and expires_at <= clock_timestamp() + interval '24 hours'
  from account_gateway_private.budgets where bucket_key = repeat('a',64)||':reset-password'), 'account expires 24 hours after admission');

update account_gateway_private.budgets set admitted_at = array_fill(clock_timestamp(), array[100]) where bucket_key = 'global';
create temporary table beta_security_global_before as select * from account_gateway_private.budgets;
select results_eq($$select allowed from public.consume_account_gateway_budget_v1(repeat('b',64),'create-account')$$,
  $$select false$$, 'global admission 101 is denied');
select results_eq($$select * from account_gateway_private.budgets order by bucket_key$$,
  $$select * from beta_security_global_before order by bucket_key$$, 'global denial creates no new bucket and does not extend cooldown');

update account_gateway_private.budgets set admitted_at = '{}' where bucket_key = 'global';
insert into account_gateway_private.budgets(bucket_key, expires_at)
  select md5('beta-security-expired-'||fixture)||md5('beta-security-expired-'||fixture)||':create-account', clock_timestamp() - interval '25 hours'
  from generate_series(1,201) as fixture;
select results_eq($$select * from public.consume_account_gateway_budget_v1(repeat('c',64),'create-account')$$,
  $$select true,0$$, 'admission runs bounded expiry cleanup');
select is((select count(*)::integer from account_gateway_private.budgets where expires_at < clock_timestamp()), 101, 'one admission cleans at most 100 expired accounts');

create function public.beta_security_fail_account_update() returns trigger language plpgsql as $$
begin
  if new.bucket_key <> 'global' then raise exception 'Synthetic account write failure'; end if;
  return new;
end;
$$;
create trigger beta_security_fail_account_update before update on account_gateway_private.budgets
  for each row execute function public.beta_security_fail_account_update();
create temporary table beta_security_atomic_before as select * from account_gateway_private.budgets;
select throws_ok($$select public.consume_account_gateway_budget_v1(repeat('d',64),'reset-password')$$,
  'P0001', 'Synthetic account write failure', 'failed account write aborts admission');
select results_eq($$select * from account_gateway_private.budgets order by bucket_key$$,
  $$select * from beta_security_atomic_before order by bucket_key$$, 'global debit and new bucket roll back atomically');

select * from finish();
rollback;