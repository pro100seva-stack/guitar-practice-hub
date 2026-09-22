-- Transactional program actions for starting and resuming practice paths.

create or replace function public.pause_active_program(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  create temporary table if not exists active_programs_to_pause (
    id uuid primary key
  ) on commit drop;

  truncate active_programs_to_pause;
  insert into active_programs_to_pause
  select id from programs where user_id = p_user_id and status = 'active';

  update programs
  set status = 'paused', updated_at = now()
  where user_id = p_user_id and status = 'active';

  update plan_weeks
  set week_number = null, start_date = null, end_date = null, updated_at = now()
  where user_id = p_user_id
    and program_id in (select id from active_programs_to_pause)
    and start_date > current_date;
end;
$$;

create or replace function public.pause_current_program()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  perform pause_active_program(auth.uid());
end;
$$;

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

  insert into programs (user_id, name, status)
  values (caller_id, 'Default Practice Program', 'active')
  returning id into new_program_id;

  for week_index in 1..5 loop
    insert into plan_weeks (
      user_id, program_id, program_sequence, week_number,
      start_date, end_date, phase, focus, tasks
    ) values (
      caller_id, new_program_id, week_index, next_week_number + week_index,
      first_start_date + ((week_index - 1) * 7),
      first_start_date + ((week_index - 1) * 7) + 6,
      'course1', focus_values[week_index],
      'Warmup, Technique, Rhythm, and Improv./Solo practice blocks.'
    );
  end loop;

  return new_program_id;
end;
$$;

create or replace function public.start_custom_program(program_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  new_program_id uuid;
begin
  if caller_id is null then raise exception 'Not authenticated'; end if;
  if length(btrim(program_name)) = 0 then raise exception 'Program name is required'; end if;

  perform pause_active_program(caller_id);

  insert into programs (user_id, name, status)
  values (caller_id, btrim(program_name), 'active')
  returning id into new_program_id;

  return new_program_id;
end;
$$;

create or replace function public.resume_program(target_program_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  target_week_id uuid;
  next_week_number int;
  last_end_date date;
  first_start_date date;
begin
  if caller_id is null then raise exception 'Not authenticated'; end if;

  if not exists (
    select 1 from programs
    where id = target_program_id and user_id = caller_id and status = 'paused'
  ) then
    raise exception 'Paused program not found';
  end if;

  perform pause_active_program(caller_id);

  select id into target_week_id
  from plan_weeks
  where program_id = target_program_id and user_id = caller_id and week_number is null
  order by program_sequence
  limit 1;

  if target_week_id is null then raise exception 'Paused program has no unscheduled weeks'; end if;

  select coalesce(max(week_number), 0), max(end_date)
  into next_week_number, last_end_date
  from plan_weeks
  where user_id = caller_id and week_number is not null;

  first_start_date := greatest(
    coalesce(last_end_date + 1, date_trunc('week', current_date)::date),
    date_trunc('week', current_date)::date
  );

  update plan_weeks
  set week_number = next_week_number + 1,
      start_date = first_start_date,
      end_date = first_start_date + 6,
      updated_at = now()
  where id = target_week_id;

  update programs
  set status = 'active', updated_at = now()
  where id = target_program_id and user_id = caller_id;

  return target_week_id;
end;
$$;

revoke all on function public.pause_active_program(uuid) from public, anon, authenticated;
grant execute on function public.pause_current_program() to authenticated;
grant execute on function public.start_default_program() to authenticated;
grant execute on function public.start_custom_program(text) to authenticated;
grant execute on function public.resume_program(uuid) to authenticated;