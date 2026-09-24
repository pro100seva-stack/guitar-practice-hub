-- Persist visibility of block target practice times.

alter table public.app_settings
  add column if not exists show_target_practice_time boolean not null default true;
