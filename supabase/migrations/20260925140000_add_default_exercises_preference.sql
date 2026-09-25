alter table public.app_settings
  add column if not exists include_default_exercises boolean not null default true;