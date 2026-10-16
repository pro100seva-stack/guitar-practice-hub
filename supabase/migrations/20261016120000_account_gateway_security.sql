begin;

create schema if not exists account_gateway_private;
revoke all on schema account_gateway_private from public, anon, authenticated, service_role;

create table if not exists account_gateway_private.budgets (
  bucket_key text primary key,
  admitted_at timestamptz[] not null default '{}',
  expires_at timestamptz not null,
  constraint account_gateway_budget_key_check check (
    bucket_key = 'global' or bucket_key ~ '^[a-f0-9]{64}:(create-account|get-recovery-question|reset-password)$'
  ),
  constraint account_gateway_budget_size_check check (cardinality(admitted_at) <= 100)
);
create index if not exists account_gateway_budgets_expiry_idx
  on account_gateway_private.budgets (expires_at) where bucket_key <> 'global';
alter table account_gateway_private.budgets enable row level security;
revoke all on table account_gateway_private.budgets from public, anon, authenticated, service_role;

create or replace function public.consume_account_gateway_budget_v1(p_login_hash text, p_action text)
returns table(allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  global_times timestamptz[];
  account_times timestamptz[];
  account_key text;
  decision_time timestamptz;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception using errcode = '42501', message = 'Service role required';
  end if;
  if p_login_hash is null or p_login_hash !~ '^[a-f0-9]{64}$'
    or p_action is null or p_action not in ('create-account', 'get-recovery-question', 'reset-password') then
    raise exception using errcode = '22023', message = 'Invalid budget arguments';
  end if;

  insert into account_gateway_private.budgets (bucket_key, expires_at)
  values ('global', clock_timestamp() + interval '24 hours')
  on conflict (bucket_key) do nothing;
  select admitted_at into global_times from account_gateway_private.budgets
  where bucket_key = 'global' for update;
  decision_time := clock_timestamp();
  global_times := array(select stamp from unnest(global_times) as stamp
    where stamp > decision_time - interval '15 minutes' order by stamp);
  if cardinality(global_times) >= 100 then
    return query select false, greatest(1, ceil(extract(epoch from
      (global_times[1] + interval '15 minutes' - decision_time)))::integer);
    return;
  end if;

  account_key := p_login_hash || ':' || p_action;
  insert into account_gateway_private.budgets (bucket_key, expires_at)
  values (account_key, decision_time + interval '24 hours')
  on conflict (bucket_key) do nothing;
  select admitted_at into account_times from account_gateway_private.budgets
  where bucket_key = account_key for update;
  account_times := array(select stamp from unnest(account_times) as stamp
    where stamp > decision_time - interval '15 minutes' order by stamp);
  if cardinality(account_times) >= 5 then
    return query select false, greatest(1, ceil(extract(epoch from
      (account_times[1] + interval '15 minutes' - decision_time)))::integer);
    return;
  end if;

  update account_gateway_private.budgets
  set admitted_at = array_append(global_times, decision_time), expires_at = decision_time + interval '24 hours'
  where bucket_key = 'global';
  update account_gateway_private.budgets
  set admitted_at = array_append(account_times, decision_time), expires_at = decision_time + interval '24 hours'
  where bucket_key = account_key;
  delete from account_gateway_private.budgets
  where bucket_key in (
    select bucket_key from account_gateway_private.budgets
    where bucket_key <> 'global' and expires_at <= decision_time
    order by expires_at, bucket_key limit 100
  );
  return query select true, 0;
end;
$$;

revoke all on function public.consume_account_gateway_budget_v1(text, text) from public, anon, authenticated;
grant execute on function public.consume_account_gateway_budget_v1(text, text) to service_role;

drop policy if exists "user_profiles_owner_select" on public.user_profiles;
drop policy if exists "user_profiles_owner_insert" on public.user_profiles;
drop policy if exists "user_profiles_owner_update" on public.user_profiles;
drop policy if exists "user_profiles_owner_delete" on public.user_profiles;
alter table public.user_profiles enable row level security;
revoke all on table public.user_profiles from public, anon, authenticated;
grant select, insert, update, delete on table public.user_profiles to service_role;

commit;