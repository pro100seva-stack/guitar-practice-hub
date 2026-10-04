-- Flexible programs foundation.
-- Existing plan_weeks rows remain scheduled legacy/custom rows with no program.

create table if not exists programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint programs_name_not_blank check (length(btrim(name)) > 0),
  constraint programs_status_check check (status in ('active', 'paused', 'completed', 'abandoned')),
  unique (id, user_id)
);

create unique index if not exists programs_one_active_per_user
  on programs (user_id)
  where status = 'active';

alter table plan_weeks
  add column if not exists program_id uuid,
  add column if not exists program_sequence int;

alter table plan_weeks
  alter column week_number drop not null,
  alter column start_date drop not null,
  alter column end_date drop not null;

alter table plan_weeks
  drop constraint if exists plan_weeks_user_id_week_number_key;

alter table plan_weeks
  add constraint plan_weeks_program_owner_fkey
    foreign key (program_id, user_id) references programs(id, user_id),
  add constraint plan_weeks_schedule_consistency_check
    check (
      (week_number is null and start_date is null and end_date is null)
      or (week_number is not null and start_date is not null and end_date is not null)
    ),
  add constraint plan_weeks_program_sequence_check
    check (
      (program_id is null and program_sequence is null)
      or (program_id is not null and program_sequence is not null and program_sequence > 0)
    );

create unique index if not exists plan_weeks_user_week_number_key
  on plan_weeks (user_id, week_number)
  where week_number is not null;

create unique index if not exists plan_weeks_program_sequence_key
  on plan_weeks (program_id, program_sequence)
  where program_id is not null and program_sequence is not null;

create index if not exists idx_plan_weeks_program on plan_weeks (program_id, program_sequence);

alter table programs enable row level security;

create policy "programs_owner_select" on programs
  for select using (auth.uid() = user_id);
create policy "programs_owner_insert" on programs
  for insert with check (auth.uid() = user_id);
create policy "programs_owner_update" on programs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "programs_owner_delete" on programs
  for delete using (auth.uid() = user_id);

grant select, insert, update, delete on table public.programs to service_role;