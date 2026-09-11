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

create table if not exists plan_weeks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  week_number int not null,
  start_date date not null,
  end_date date not null,
  phase text not null,               -- 'course1' | 'course2' | 'concert_prep' | 'concert_week' | 'historical' | ... (open text, not enum, so new phases don't need a migration)
  focus text not null,               -- short title for the week
  tasks text,                        -- longer freeform plan description
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_number)
);

create table if not exists topics (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references plan_weeks(id) on delete cascade,
  name text not null,
  source text,                       -- e.g. course/video name this topic comes from
  done boolean not null default false,
  sort_order int not null default 0
);

create table if not exists songs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  name text not null,
  status text not null default 'learning',  -- 'planned' | 'learning' | 'maintained' | 'retired'
  tuning text,                       -- NULL = standard. Free text: 'Drop D', '1/2 step down', etc. -- not an enum, so new tunings don't need a migration
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists week_songs (
  week_id uuid not null references plan_weeks(id) on delete cascade,
  song_id uuid not null references songs(id) on delete cascade,
  primary key (week_id, song_id)
);

-- ---------- Session block templates ----------
-- Defines the universal set of practice blocks (phase = 'common').
-- Sessions copy from this at creation time, so editing a template
-- later doesn't retroactively change already-logged sessions.
-- See migrations/02-block-templates-v2.sql for the current data.

create table if not exists block_templates (
  id uuid primary key default gen_random_uuid(),
  phase text not null,
  key text not null,                 -- 'warmup' | 'technique' | 'rhythm' | 'harmony' | 'repertoire' | 'evening' | 'learning'
  label text not null,
  target_minutes int not null,
  description text,
  sort_order int not null default 0,
  unique (phase, key)
);

-- ---------- Practice sessions ----------

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  session_date date not null,
  week_id uuid references plan_weeks(id),
  total_minutes int not null default 0,
  comment text,
  source text not null default 'app',   -- 'app' | 'notion_import'
  logged_at timestamptz not null default now(),
  unique (user_id, session_date)
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
  user_id uuid primary key references auth.users(id) default auth.uid(),
  metronome_bpm int not null default 90,
  metronome_beats int not null default 4,
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
create index if not exists idx_topics_week on topics (week_id);
