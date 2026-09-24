-- Persist user-facing preferences alongside metronome settings.

alter table public.app_settings
  add column if not exists habit_reminders boolean not null default true,
  add column if not exists show_completed_weeks boolean not null default true,
  add column if not exists collapse_plan_notes boolean not null default false,
  add column if not exists compact_practice_cards boolean not null default false;
