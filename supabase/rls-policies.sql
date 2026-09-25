-- ============================================================
-- Guitar Practice Hub — v1 Row Level Security Policies
-- ============================================================
-- Applies to the schema in schema.sql.
-- Design: single-user v1, but modeled as owner-scoped from day
-- one so no rewrite is needed later.
--
-- IMPORTANT — RLS default-deny behavior:
-- Enabling RLS on a table blocks ALL access for ALL roles except
-- where an explicit policy grants it. If a table has RLS enabled
-- and no policy for a given command (e.g. no INSERT policy),
-- that command is refused outright — there is no implicit access.
-- ============================================================

alter table plan_weeks     enable row level security;
alter table todos          enable row level security;
alter table songs          enable row level security;
alter table week_songs     enable row level security;
alter table block_templates enable row level security;
alter table sessions       enable row level security;
alter table session_blocks enable row level security;
alter table app_settings   enable row level security;
alter table user_profiles enable row level security;

-- ---------- Direct ownership (user_id column present) ----------

create policy "plan_weeks_owner_select" on plan_weeks
  for select using (auth.uid() = user_id);
create policy "plan_weeks_owner_insert" on plan_weeks
  for insert with check (auth.uid() = user_id);
create policy "plan_weeks_owner_update" on plan_weeks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "plan_weeks_owner_delete" on plan_weeks
  for delete using (auth.uid() = user_id);

create policy "songs_owner_select" on songs
  for select using (auth.uid() = user_id);
create policy "songs_owner_insert" on songs
  for insert with check (auth.uid() = user_id);
create policy "songs_owner_update" on songs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "songs_owner_delete" on songs
  for delete using (auth.uid() = user_id);

create policy "sessions_owner_select" on sessions
  for select using (auth.uid() = user_id);
create policy "sessions_owner_insert" on sessions
  for insert with check (auth.uid() = user_id);
create policy "sessions_owner_update" on sessions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "sessions_owner_delete" on sessions
  for delete using (auth.uid() = user_id);

create policy "app_settings_owner_select" on app_settings
  for select using (auth.uid() = user_id);
create policy "app_settings_owner_insert" on app_settings
  for insert with check (auth.uid() = user_id);
create policy "app_settings_owner_update" on app_settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "app_settings_owner_delete" on app_settings
  for delete using (auth.uid() = user_id);

create policy "user_profiles_owner_select" on user_profiles
  for select using (auth.uid() = user_id);
create policy "user_profiles_owner_insert" on user_profiles
  for insert with check (auth.uid() = user_id);
create policy "user_profiles_owner_update" on user_profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_profiles_owner_delete" on user_profiles
  for delete using (auth.uid() = user_id);

-- ---------- Indirect ownership (via parent FK, no user_id column) ----------

create policy "todos_owner_select" on todos
  for select using (
    exists (select 1 from plan_weeks w where w.id = todos.week_id and w.user_id = auth.uid())
  );
create policy "todos_owner_insert" on todos
  for insert with check (
    exists (select 1 from plan_weeks w where w.id = todos.week_id and w.user_id = auth.uid())
  );
create policy "todos_owner_update" on todos
  for update using (
    exists (select 1 from plan_weeks w where w.id = todos.week_id and w.user_id = auth.uid())
  ) with check (
    exists (select 1 from plan_weeks w where w.id = todos.week_id and w.user_id = auth.uid())
  );
create policy "todos_owner_delete" on todos
  for delete using (
    exists (select 1 from plan_weeks w where w.id = todos.week_id and w.user_id = auth.uid())
  );

create policy "session_blocks_owner_select" on session_blocks
  for select using (
    exists (select 1 from sessions se where se.id = session_blocks.session_id and se.user_id = auth.uid())
  );
create policy "session_blocks_owner_insert" on session_blocks
  for insert with check (
    exists (select 1 from sessions se where se.id = session_blocks.session_id and se.user_id = auth.uid())
  );
create policy "session_blocks_owner_update" on session_blocks
  for update using (
    exists (select 1 from sessions se where se.id = session_blocks.session_id and se.user_id = auth.uid())
  ) with check (
    exists (select 1 from sessions se where se.id = session_blocks.session_id and se.user_id = auth.uid())
  );
create policy "session_blocks_owner_delete" on session_blocks
  for delete using (
    exists (select 1 from sessions se where se.id = session_blocks.session_id and se.user_id = auth.uid())
  );

-- week_songs: composite-key join table between plan_weeks and songs.
-- Insert requires BOTH sides to already belong to the caller — prevents
-- linking your week to someone else's song row (irrelevant at 1 user,
-- kept for correctness / future-proofing).
create policy "week_songs_owner_select" on week_songs
  for select using (
    exists (select 1 from plan_weeks w where w.id = week_songs.week_id and w.user_id = auth.uid())
  );
create policy "week_songs_owner_insert" on week_songs
  for insert with check (
    exists (select 1 from plan_weeks w where w.id = week_songs.week_id and w.user_id = auth.uid())
    and exists (select 1 from songs s where s.id = week_songs.song_id and s.user_id = auth.uid())
  );
create policy "week_songs_owner_delete" on week_songs
  for delete using (
    exists (select 1 from plan_weeks w where w.id = week_songs.week_id and w.user_id = auth.uid())
  );
-- No update policy: junction table has no columns besides the composite
-- key, so an "update" is meaningless — delete + insert covers it.

-- ---------- Global reference data (no user_id, shared across all users) ----------
-- block_templates is app-defined reference data, not user data. Any
-- authenticated user can read it; nobody can write it through the
-- client API. Template changes happen via migrations (service_role,
-- which bypasses RLS entirely), not through the app.

create policy "block_templates_read_all" on block_templates
  for select using (auth.role() = 'authenticated');
-- Deliberately no insert/update/delete policy here.
