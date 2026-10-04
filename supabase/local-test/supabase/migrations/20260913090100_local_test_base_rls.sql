-- Local test bootstrap only. These are the committed pre-numbered-migration
-- RLS policies, kept separate so the legacy migration sequence starts cleanly.

alter table plan_weeks enable row level security;
alter table topics enable row level security;
alter table songs enable row level security;
alter table week_songs enable row level security;
alter table block_templates enable row level security;
alter table sessions enable row level security;
alter table session_blocks enable row level security;
alter table app_settings enable row level security;

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

create policy "topics_owner_select" on topics
  for select using (
    exists (select 1 from plan_weeks w where w.id = topics.week_id and w.user_id = auth.uid())
  );
create policy "topics_owner_insert" on topics
  for insert with check (
    exists (select 1 from plan_weeks w where w.id = topics.week_id and w.user_id = auth.uid())
  );
create policy "topics_owner_update" on topics
  for update using (
    exists (select 1 from plan_weeks w where w.id = topics.week_id and w.user_id = auth.uid())
  ) with check (
    exists (select 1 from plan_weeks w where w.id = topics.week_id and w.user_id = auth.uid())
  );
create policy "topics_owner_delete" on topics
  for delete using (
    exists (select 1 from plan_weeks w where w.id = topics.week_id and w.user_id = auth.uid())
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

create policy "block_templates_read_all" on block_templates
  for select using (auth.role() = 'authenticated');