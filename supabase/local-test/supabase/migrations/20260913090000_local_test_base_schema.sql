-- Local test bootstrap only. This is the committed pre-numbered-migration
-- schema, not a representation of remote migration history.

create table if not exists plan_weeks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  week_number int not null,
  start_date date not null,
  end_date date not null,
  phase text not null,
  focus text not null,
  tasks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_number)
);

create table if not exists topics (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references plan_weeks(id) on delete cascade,
  name text not null,
  source text,
  done boolean not null default false,
  sort_order int not null default 0
);

create table if not exists songs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  name text not null,
  status text not null default 'learning',
  tuning text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists week_songs (
  week_id uuid not null references plan_weeks(id) on delete cascade,
  song_id uuid not null references songs(id) on delete cascade,
  primary key (week_id, song_id)
);

create table if not exists block_templates (
  id uuid primary key default gen_random_uuid(),
  phase text not null,
  key text not null,
  label text not null,
  target_minutes int not null,
  description text,
  sort_order int not null default 0,
  unique (phase, key)
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  session_date date not null,
  week_id uuid references plan_weeks(id),
  total_minutes int not null default 0,
  comment text,
  source text not null default 'app',
  logged_at timestamptz not null default now(),
  unique (user_id, session_date)
);

create table if not exists session_blocks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  block_key text not null,
  label text not null,
  target_minutes int,
  actual_minutes int,
  done boolean not null default false
);

create table if not exists app_settings (
  user_id uuid primary key references auth.users(id) default auth.uid(),
  metronome_bpm int not null default 90,
  metronome_beats int not null default 4,
  updated_at timestamptz not null default now()
);

create index if not exists idx_sessions_date on sessions (session_date);
create index if not exists idx_plan_weeks_dates on plan_weeks (start_date, end_date);
create index if not exists idx_session_blocks_session on session_blocks (session_id);
create index if not exists idx_topics_week on topics (week_id);