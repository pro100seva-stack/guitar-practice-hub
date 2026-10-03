alter table public.app_settings
  add column if not exists onboarding_tour_pending boolean not null default false;
