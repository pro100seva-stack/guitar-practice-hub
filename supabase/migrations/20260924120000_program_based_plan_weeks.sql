-- Make programs the source of truth for plan-week ownership and duration.

alter table public.programs
  add column if not exists total_weeks int not null default 5;

alter table public.programs
  add constraint programs_total_weeks_check
  check (total_weeks > 0);

-- Legacy rows without a program are attached to the user's Default program.
do $$
declare
  user_record record;
  default_program_id uuid;
begin
  for user_record in
    select distinct user_id
    from public.plan_weeks
    where program_id is null
  loop
    select id into default_program_id
    from public.programs
    where user_id = user_record.user_id
      and name = 'Default Practice Program'
    order by created_at
    limit 1;

    if default_program_id is null then
      insert into public.programs (user_id, name, status, total_weeks)
      values (user_record.user_id, 'Default Practice Program', 'active', 5)
      returning id into default_program_id;
    end if;

    with legacy_weeks as (
      select id,
             coalesce(
               (select max(program_sequence)
                from public.plan_weeks existing
                where existing.program_id = default_program_id),
               0
             ) + row_number() over (order by week_number, id) as next_sequence
      from public.plan_weeks
      where user_id = user_record.user_id and program_id is null
    )
    update public.plan_weeks week
    set program_id = default_program_id,
        program_sequence = legacy_weeks.next_sequence,
        updated_at = now()
    from legacy_weeks
    where week.id = legacy_weeks.id;
  end loop;
end;
$$;

alter table public.plan_weeks
  alter column program_id set not null;

alter table public.plan_weeks
  drop column if exists phase;

drop function if exists public.add_plan_week(date, date, text, text, text, uuid);

create or replace function public.add_plan_week(
  p_start_date date,
  p_end_date date,
  p_program_id uuid,
  p_focus text,
  p_tasks text,
  p_insert_after_week_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  insert_after_week_number int;
  current_max_week_number int;
  next_week_number int;
  duration_days int;
  inserted_week_id uuid;
begin
  if caller_id is null then raise exception 'Not authenticated'; end if;
  if p_end_date < p_start_date then raise exception 'Week end date must be on or after the start date'; end if;
  if not exists (
    select 1 from programs
    where id = p_program_id and user_id = caller_id
  ) then raise exception 'Program not found'; end if;

  select max(week_number)
  into current_max_week_number
  from plan_weeks
  where user_id = caller_id and week_number is not null;

  if p_insert_after_week_id is null then
    insert_after_week_number := coalesce(current_max_week_number, 0);
  else
    select week_number
    into insert_after_week_number
    from plan_weeks
    where id = p_insert_after_week_id and user_id = caller_id and week_number is not null;

    if insert_after_week_number is null then raise exception 'Plan week not found'; end if;
  end if;

  next_week_number := insert_after_week_number + 1;
  duration_days := p_end_date - p_start_date + 1;

  update plan_weeks
  set week_number = 100000 + week_number
  where user_id = caller_id and week_number > insert_after_week_number;

  insert into plan_weeks (
    user_id, program_id, program_sequence, week_number, start_date, end_date, focus, tasks
  ) values (
    caller_id,
    p_program_id,
    coalesce((select max(program_sequence) from plan_weeks where program_id = p_program_id), 0) + 1,
    next_week_number,
    p_start_date,
    p_end_date,
    p_focus,
    p_tasks
  ) returning id into inserted_week_id;

  update plan_weeks
  set week_number = (week_number - 100000) + 1,
      start_date = start_date + duration_days,
      end_date = end_date + duration_days,
      updated_at = now()
  where user_id = caller_id and week_number >= 100000;

  perform pause_active_program(caller_id);
  return inserted_week_id;
end;
$$;

grant execute on function public.add_plan_week(date, date, uuid, text, text, uuid) to authenticated;

create or replace function public.start_default_program()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  new_program_id uuid;
  next_week_number int;
  last_end_date date;
  first_start_date date;
  focus_values text[] := array[
    'Warmup and foundation',
    'Technique and rhythm',
    'Repertoire building',
    'Harmony and improvisation',
    'Review and integration'
  ];
  week_index int;
begin
  if caller_id is null then raise exception 'Not authenticated'; end if;

  perform pause_active_program(caller_id);

  select coalesce(max(week_number), 0), max(end_date)
  into next_week_number, last_end_date
  from plan_weeks
  where user_id = caller_id and week_number is not null;

  first_start_date := greatest(
    coalesce(last_end_date + 1, date_trunc('week', current_date)::date),
    date_trunc('week', current_date)::date
  );

  insert into programs (user_id, name, status, total_weeks)
  values (caller_id, 'Default Practice Program', 'active', 5)
  returning id into new_program_id;

  for week_index in 1..5 loop
    insert into plan_weeks (
      user_id, program_id, program_sequence, week_number,
      start_date, end_date, focus, tasks
    ) values (
      caller_id, new_program_id, week_index, next_week_number + week_index,
      first_start_date + ((week_index - 1) * 7),
      first_start_date + ((week_index - 1) * 7) + 6,
      focus_values[week_index],
      'Warmup, Technique, Rhythm, and Improv./Solo practice blocks.'
    );
  end loop;

  return new_program_id;
end;
$$;

grant execute on function public.start_default_program() to authenticated;
