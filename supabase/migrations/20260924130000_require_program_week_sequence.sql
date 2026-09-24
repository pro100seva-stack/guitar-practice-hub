-- Every program-owned week needs a stable sequence within its program.

alter table public.plan_weeks
  alter column program_sequence set not null;
