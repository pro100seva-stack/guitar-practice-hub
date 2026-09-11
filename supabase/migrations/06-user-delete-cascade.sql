-- Allow an Auth user to be deleted cleanly from Supabase Authentication.
-- Owned application rows are removed with the auth.users record.

alter table public.plan_weeks drop constraint if exists plan_weeks_user_id_fkey;
alter table public.plan_weeks
  add constraint plan_weeks_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.songs drop constraint if exists songs_user_id_fkey;
alter table public.songs
  add constraint songs_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.sessions drop constraint if exists sessions_user_id_fkey;
alter table public.sessions
  add constraint sessions_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.app_settings drop constraint if exists app_settings_user_id_fkey;
alter table public.app_settings
  add constraint app_settings_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;