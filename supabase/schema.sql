-- ============================================================
-- Guitar Practice Hub — v1 Postgres Schema (Supabase)
-- ============================================================
-- Requires pgcrypto extension for gen_random_uuid() — enabled
-- by default on Supabase projects.
--
-- Every table carries user_id even though v1 is single-user.
-- This aligns with Supabase RLS conventions and avoids a schema
-- rewrite if multi-user is ever needed later. RLS policies live
-- in rls-policies.sql — they must be applied before real data goes in.
-- ============================================================

-- ---------- Plan structure ----------

create table if not exists programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  status text not null default 'active',
  total_weeks int not null default 5,
  block_set_mode text not null default 'legacy_unconfigured',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint programs_name_not_blank check (length(btrim(name)) > 0),
  constraint programs_total_weeks_check check (total_weeks > 0),
  constraint programs_block_set_mode_check
    check (block_set_mode in ('legacy_unconfigured', 'same_every_week', 'varies_by_week')),
  unique (id, user_id)
);

create table if not exists plan_weeks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  week_number int not null,
  start_date date not null,
  end_date date not null,
  program_id uuid not null references programs(id),
  program_sequence int not null,
  focus text not null,               -- short title for the week
  tasks text,                        -- longer freeform plan description
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_number),
  unique (program_id, program_sequence)
);

create table if not exists todos (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references plan_weeks(id) on delete cascade,
  name text not null,
  source text,                       -- e.g. course/video name this topic comes from
  done boolean not null default false,
  sort_order int not null default 0
);

create table if not exists songs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  status text not null default 'learning',  -- 'planned' | 'learning' | 'maintained' | 'retired'
  tuning text,                       -- NULL = standard. Free text: 'Drop D', '1/2 step down', etc. -- not an enum, so new tunings don't need a migration
  notes text,
  created_at timestamptz not null default now(),
  constraint songs_status_domain_check
    check (status in ('planned', 'learning', 'maintained', 'retired'))
);

create table if not exists week_songs (
  week_id uuid not null references plan_weeks(id) on delete cascade,
  song_id uuid not null references songs(id) on delete cascade,
  sort_order integer not null,
  primary key (week_id, song_id)
);

create unique index if not exists week_songs_week_sort_order_idx
  on week_songs (week_id, sort_order);

-- ---------- Session block templates ----------
-- Defines the universal set of practice blocks (phase = 'common').
-- Sessions copy from this at creation time, so editing a template
-- later doesn't retroactively change already-logged sessions.
-- See migrations/02-block-templates-v2.sql for the current data.

create table if not exists block_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  phase text not null,
  key text not null,                 -- 'warmup' | 'technique' | 'rhythm' | 'harmony' | 'repertoire' | 'evening' | 'learning'
  label text not null,
  target_minutes int,
  description text,
  sort_order int not null default 0,
  category_key text not null default 'other',
  is_selectable boolean not null default true,
  archived_at timestamptz,
  unique (phase, key),
  constraint block_templates_category_key_check
    check (category_key in (
      'technique_warmups', 'chords_rhythm', 'scales_fretboard',
      'ear_training', 'repertoire_songwork', 'improvisation_composition', 'other'
    )),
  constraint block_templates_custom_blocks_are_other_check
    check (user_id is null or category_key = 'other'),
  unique (key)
);

create table if not exists program_blocks (
  program_id uuid not null references programs(id) on delete cascade,
  block_key text not null references block_templates(key),
  sort_order int not null check (sort_order > 0),
  primary key (program_id, block_key),
  unique (program_id, sort_order)
);

create table if not exists plan_week_blocks (
  week_id uuid not null references plan_weeks(id) on delete cascade,
  block_key text not null references block_templates(key),
  sort_order int not null check (sort_order > 0),
  primary key (week_id, block_key),
  unique (week_id, sort_order)
);

-- ---------- Practice sessions ----------

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  session_date date not null,
  week_id uuid references plan_weeks(id),
  total_minutes int not null default 0,
  comment text,
  source text not null default 'app',   -- 'app' | 'notion_import'
  logged_at timestamptz not null default now(),
  unique (user_id, session_date),
  constraint sessions_source_domain_check
    check (source in ('app', 'notion_import'))
);

create table if not exists session_blocks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  block_key text not null,           -- matches block_templates.key where applicable; free text for imported categories
  label text not null,
  target_minutes int,                -- null for imported rows (Notion never tracked per-category time)
  actual_minutes int,                -- null for imported rows (only the checkbox was known, not duration)
  done boolean not null default false,
  unique (session_id, block_key)
);

-- ---------- Cross-device settings ----------

create table if not exists app_settings (
  user_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  metronome_bpm int not null default 90,
  metronome_beats int not null default 4,
  onboarding_tour_pending boolean not null default false,
  updated_at timestamptz not null default now()
);

-- ---------- User-facing account identity ----------

create table if not exists user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  login_name text not null,
  security_question text not null,
  security_answer_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_profiles_login_name_not_blank check (length(btrim(login_name)) > 0),
  constraint user_profiles_security_question_not_blank check (length(btrim(security_question)) > 0),
  constraint user_profiles_security_answer_hash_not_blank check (length(btrim(security_answer_hash)) > 0)
);

create unique index if not exists user_profiles_login_name_lower_key
  on user_profiles (lower(login_name));

grant select, insert, update, delete on table public.user_profiles to service_role;
grant select, insert, update, delete on table public.plan_weeks to service_role;

-- ---------- Indexes ----------

create index if not exists idx_sessions_date on sessions (session_date);
create index if not exists idx_plan_weeks_dates on plan_weeks (start_date, end_date);
create index if not exists idx_session_blocks_session on session_blocks (session_id);
create index if not exists idx_todos_week on todos (week_id);

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
