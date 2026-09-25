alter table public.app_settings
  drop column if exists habit_reminders,
  drop column if exists compact_practice_cards,
  drop column if exists collapse_plan_notes;