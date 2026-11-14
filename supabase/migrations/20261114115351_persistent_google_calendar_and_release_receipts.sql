begin;

alter table public.app_settings add column if not exists last_seen_release_version text;
alter table public.app_settings add constraint app_settings_release_version_format
  check (last_seen_release_version is null or last_seen_release_version ~ '^(0|[1-9][0-9]{0,5})\.(0|[1-9][0-9]{0,5})\.(0|[1-9][0-9]{0,5})$');

-- A conditional upsert is a single row-locking operation: concurrent tabs/devices
-- can claim a new stable version only once, and older builds never move it back.
create or replace function public.claim_release_notice(p_version text,p_expected_user_id uuid)
returns boolean language plpgsql security invoker set search_path = pg_catalog as $$
declare caller_id uuid := auth.uid(); changed integer;
begin
  if caller_id is null then raise exception using errcode = '42501', message = 'Not authenticated'; end if;
  if p_expected_user_id is distinct from caller_id then raise exception using errcode = '42501', message = 'Account changed'; end if;
  if p_version is null or p_version !~ '^(0|[1-9][0-9]{0,5})\.(0|[1-9][0-9]{0,5})\.(0|[1-9][0-9]{0,5})$' then
    raise exception using errcode = '22023', message = 'Invalid release version';
  end if;
  insert into public.app_settings(user_id,last_seen_release_version)
  values(caller_id,p_version)
  on conflict(user_id) do update set last_seen_release_version = excluded.last_seen_release_version
  where public.app_settings.last_seen_release_version is null
     or string_to_array(public.app_settings.last_seen_release_version,'.')::integer[] < string_to_array(excluded.last_seen_release_version,'.')::integer[];
  get diagnostics changed = row_count;
  return changed = 1;
end;
$$;
revoke all on function public.claim_release_notice(text,uuid) from public,anon;
grant execute on function public.claim_release_notice(text,uuid) to authenticated;

-- Tokens never enter authenticated client rows. Even ciphertext is service-only.
create table public.calendar_google_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  generation uuid not null default gen_random_uuid(),
  linked boolean not null default false,
  needs_reconnect boolean not null default false,
  token_ciphertext text check (token_ciphertext is null or length(token_ciphertext) <= 32000),
  updated_at timestamptz not null default now(),
  constraint calendar_connection_token check (not linked or needs_reconnect or token_ciphertext is not null)
);
create table public.calendar_google_oauth_states (
  state_hash text primary key check (state_hash ~ '^[0-9a-f]{64}$'),
  user_id uuid not null references auth.users(id) on delete cascade,
  origin text not null check (length(origin) <= 300),
  generation uuid not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index calendar_google_oauth_states_owner_expiry on public.calendar_google_oauth_states(user_id,expires_at);
create table public.calendar_google_request_budgets (
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in ('status','begin','connect','list-calendars','insert-plan','disconnect')),
  window_start timestamptz not null,
  requests integer not null check(requests > 0),
  primary key(user_id,action,window_start)
);
alter table public.calendar_google_connections enable row level security;
alter table public.calendar_google_oauth_states enable row level security;
alter table public.calendar_google_request_budgets enable row level security;
revoke all on public.calendar_google_connections,public.calendar_google_oauth_states,public.calendar_google_request_budgets from public,anon,authenticated;
grant select,insert,update,delete on public.calendar_google_connections,public.calendar_google_oauth_states,public.calendar_google_request_budgets to service_role;

create or replace function public.consume_calendar_google_budget(p_user_id uuid,p_action text)
returns boolean language plpgsql security invoker set search_path = pg_catalog as $$
declare used integer; max_requests integer;
begin
  max_requests := case p_action when 'status' then 120 when 'begin' then 5 when 'connect' then 5 when 'list-calendars' then 30 when 'insert-plan' then 5 when 'disconnect' then 10 else null end;
  if p_user_id is null or max_requests is null then raise exception using errcode = '22023',message = 'Invalid calendar budget'; end if;
  delete from public.calendar_google_request_budgets where user_id=p_user_id and window_start < now()-interval '1 day';
  insert into public.calendar_google_request_budgets(user_id,action,window_start,requests)
  values(p_user_id,p_action,date_trunc('minute',now()),1)
  on conflict(user_id,action,window_start) do update set requests=public.calendar_google_request_budgets.requests+1
  returning requests into used;
  return used <= max_requests;
end;
$$;
revoke all on function public.consume_calendar_google_budget(uuid,text) from public,anon,authenticated;
grant execute on function public.consume_calendar_google_budget(uuid,text) to service_role;

commit;
