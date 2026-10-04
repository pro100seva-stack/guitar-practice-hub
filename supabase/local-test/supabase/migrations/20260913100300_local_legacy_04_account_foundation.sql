-- Multi-user account foundation.
-- Supabase Auth remains the identity authority; this table stores only
-- application-facing identity and recovery metadata.

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

alter table user_profiles enable row level security;

create policy "user_profiles_owner_select" on user_profiles
  for select using (auth.uid() = user_id);
create policy "user_profiles_owner_insert" on user_profiles
  for insert with check (auth.uid() = user_id);
create policy "user_profiles_owner_update" on user_profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_profiles_owner_delete" on user_profiles
  for delete using (auth.uid() = user_id);