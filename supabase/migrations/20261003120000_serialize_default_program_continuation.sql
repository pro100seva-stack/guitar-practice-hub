begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.lock_user_plan_weeks(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if p_user_id is null then
    raise exception 'A user ID is required to lock the plan schedule';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'guitar-practice-hub:plan-weeks:' || p_user_id::text,
      0
    )
  );
end;
$$;

revoke all on function private.lock_user_plan_weeks(uuid) from public, anon, authenticated;

create or replace function public.continue_default_program(
  p_language text,
  p_focuses text[],
  p_tasks text
)
returns table(result text, week_id uuid, start_date date, end_date date)
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  default_program_id uuid;
  stored_language text;
  utc_today date;
  utc_monday date;
  utc_sunday date;
  latest_default_end_date date;
  next_program_sequence int;
  next_week_number int;
  focus_count int;
  focus_index int;
  selected_focus text;
  inserted_week_id uuid;
begin
  if caller_id is null then raise exception 'Not authenticated'; end if;
  if p_focuses is null or cardinality(p_focuses) = 0 or coalesce(array_ndims(p_focuses), 0) <> 1 then
    raise exception 'At least one continuation focus is required';
  end if;

  perform private.lock_user_plan_weeks(caller_id);

  select program.id, program.language
  into default_program_id, stored_language
  from programs program
  where program.user_id = caller_id
    and program.is_default = true
    and program.status = 'active'
  order by program.created_at desc, program.id desc
  limit 1;

  if not found then
    return query select 'inactive'::text, null::uuid, null::date, null::date;
    return;
  end if;

  if p_language is distinct from stored_language then
    raise exception 'Continuation language does not match the Default program language';
  end if;

  utc_today := (statement_timestamp() at time zone 'UTC')::date;
  utc_monday := date_trunc('week', utc_today::timestamp)::date;
  utc_sunday := utc_monday + 6;

  select week.end_date
  into latest_default_end_date
  from plan_weeks week
  where week.user_id = caller_id
    and week.program_id = default_program_id
    and week.week_number is not null
    and week.start_date is not null
    and week.end_date is not null
  order by week.program_sequence desc
  limit 1;

  if not found or latest_default_end_date >= utc_today then
    return query select 'not_due'::text, null::uuid, null::date, null::date;
    return;
  end if;

  if exists (
    select 1
    from plan_weeks week
    where week.user_id = caller_id
      and week.week_number is not null
      and week.start_date is not null
      and week.end_date is not null
      and week.start_date <= utc_sunday
      and week.end_date >= utc_monday
  ) then
    return query select 'overlap'::text, null::uuid, null::date, null::date;
    return;
  end if;

  select coalesce(max(week.program_sequence), 0) + 1
  into next_program_sequence
  from plan_weeks week
  where week.program_id = default_program_id;

  select coalesce(max(week.week_number), 0) + 1
  into next_week_number
  from plan_weeks week
  where week.user_id = caller_id
    and week.week_number is not null
    and week.start_date is not null
    and week.end_date is not null;

  focus_count := cardinality(p_focuses);
  focus_index := array_lower(p_focuses, 1) + mod(next_program_sequence - 1, focus_count);
  selected_focus := p_focuses[focus_index];
  if selected_focus is null or btrim(selected_focus) = '' then
    raise exception 'The selected continuation focus must not be empty';
  end if;

  insert into plan_weeks (
    user_id,
    program_id,
    program_sequence,
    week_number,
    start_date,
    end_date,
    focus,
    tasks
  ) values (
    caller_id,
    default_program_id,
    next_program_sequence,
    next_week_number,
    utc_monday,
    utc_sunday,
    selected_focus,
    p_tasks
  )
  returning id into inserted_week_id;

  return query select 'inserted'::text, inserted_week_id, utc_monday, utc_sunday;
end;
$$;

revoke all on function public.continue_default_program(text, text[], text) from public, anon;
grant execute on function public.continue_default_program(text, text[], text) to authenticated;

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
  perform private.lock_user_plan_weeks(caller_id);
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

create or replace function public.insert_plan_week(
  p_start_date date,
  p_end_date date,
  p_program_id uuid,
  p_focus text,
  p_tasks text,
  p_insert_after_week_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  insert_after_week_number int;
  next_week_number int;
  duration_days int;
  inserted_week_id uuid;
begin
  if caller_id is null then raise exception 'Not authenticated'; end if;
  perform private.lock_user_plan_weeks(caller_id);
  if p_end_date < p_start_date then raise exception 'Week end date must be on or after the start date'; end if;
  if not exists (select 1 from programs where id = p_program_id and user_id = caller_id) then raise exception 'Program not found'; end if;

  select week_number into insert_after_week_number
  from plan_weeks
  where id = p_insert_after_week_id and user_id = caller_id and week_number is not null;

  if insert_after_week_number is null then raise exception 'Plan week not found'; end if;

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

  return inserted_week_id;
end;
$$;

create or replace function public.reschedule_plan_week(
  p_week_id uuid,
  p_start_date date,
  p_end_date date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  selected_week_number int;
  cursor_start date;
  later_week record;
  later_duration_days int;
begin
  if caller_id is null then raise exception 'Not authenticated'; end if;
  perform private.lock_user_plan_weeks(caller_id);
  if p_end_date < p_start_date then raise exception 'Week end date must be on or after the start date'; end if;

  select week_number
  into selected_week_number
  from plan_weeks
  where id = p_week_id and user_id = caller_id and week_number is not null;

  if selected_week_number is null then raise exception 'Plan week not found'; end if;

  update plan_weeks
  set start_date = p_start_date,
      end_date = p_end_date,
      updated_at = now()
  where id = p_week_id and user_id = caller_id;

  cursor_start := p_end_date + 1;

  for later_week in
    select id, start_date, end_date
    from plan_weeks
    where user_id = caller_id
      and week_number > selected_week_number
      and start_date is not null
    order by week_number
  loop
    later_duration_days := later_week.end_date - later_week.start_date + 1;

    if later_week.start_date < cursor_start then
      update plan_weeks
      set start_date = cursor_start,
          end_date = cursor_start + later_duration_days - 1,
          updated_at = now()
      where id = later_week.id;
      cursor_start := cursor_start + later_duration_days;
    else
      cursor_start := later_week.end_date + 1;
    end if;
  end loop;
end;
$$;

create or replace function public.remove_plan_week(p_week_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  remaining_count int;
  removed_start_date date;
  removed_end_date date;
  removed_duration_days int;
  next_week_id uuid;
begin
  if caller_id is null then raise exception 'Not authenticated'; end if;
  perform private.lock_user_plan_weeks(caller_id);

  select count(*)
  into remaining_count
  from plan_weeks
  where user_id = caller_id and week_number is not null;

  if remaining_count <= 1 then raise exception 'At least one plan week must remain'; end if;

  select start_date, end_date
  into removed_start_date, removed_end_date
  from plan_weeks
  where id = p_week_id and user_id = caller_id and week_number is not null;

  if removed_start_date is null or removed_end_date is null then raise exception 'Plan week not found'; end if;
  removed_duration_days := removed_end_date - removed_start_date + 1;

  delete from plan_weeks where id = p_week_id and user_id = caller_id;

  update plan_weeks
  set start_date = start_date - removed_duration_days,
      end_date = end_date - removed_duration_days,
      updated_at = now()
  where user_id = caller_id
    and week_number is not null
    and start_date > removed_start_date;

  with ordered_weeks as (
    select id, row_number() over (order by start_date, id) as next_number
    from plan_weeks
    where user_id = caller_id and week_number is not null
  )
  update plan_weeks week
  set week_number = -ordered_weeks.next_number
  from ordered_weeks
  where week.id = ordered_weeks.id;

  with ordered_weeks as (
    select id, row_number() over (order by start_date, id) as next_number
    from plan_weeks
    where user_id = caller_id and week_number < 0
  )
  update plan_weeks week
  set week_number = ordered_weeks.next_number,
      updated_at = now()
  from ordered_weeks
  where week.id = ordered_weeks.id;

  select id into next_week_id
  from plan_weeks
  where user_id = caller_id and week_number = 1;

  return next_week_id;
end;
$$;

create or replace function public.assign_plan_week_program(
  p_week_id uuid,
  p_program_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  next_sequence int;
begin
  if caller_id is null then raise exception 'Not authenticated'; end if;
  perform private.lock_user_plan_weeks(caller_id);
  if not exists (
    select 1 from plan_weeks where id = p_week_id and user_id = caller_id
  ) then raise exception 'Plan week not found'; end if;
  if not exists (
    select 1 from programs where id = p_program_id and user_id = caller_id
  ) then raise exception 'Program not found'; end if;

  select coalesce(max(program_sequence), 0) + 1
  into next_sequence
  from plan_weeks
  where program_id = p_program_id;

  update plan_weeks
  set program_id = p_program_id,
      program_sequence = next_sequence,
      updated_at = now()
  where id = p_week_id and user_id = caller_id;
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
  perform private.lock_user_plan_weeks(caller_id);

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

create or replace function public.resume_program(target_program_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  target_week_id uuid;
  target_week record;
  next_week_number int;
  last_end_date date;
  first_start_date date;
  week_offset int := 0;
begin
  if caller_id is null then raise exception 'Not authenticated'; end if;
  perform private.lock_user_plan_weeks(caller_id);

  if not exists (
    select 1 from programs
    where id = target_program_id and user_id = caller_id and status = 'paused'
  ) then
    raise exception 'Paused program not found';
  end if;

  perform pause_active_program(caller_id);

  select coalesce(max(week_number), 0), max(end_date)
  into next_week_number, last_end_date
  from plan_weeks
  where user_id = caller_id and week_number is not null;

  first_start_date := greatest(
    coalesce(last_end_date + 1, date_trunc('week', current_date)::date),
    date_trunc('week', current_date)::date
  );

  for target_week in
    select id
    from plan_weeks
    where program_id = target_program_id
      and user_id = caller_id
      and week_number is null
    order by program_sequence
  loop
    if target_week_id is null then target_week_id := target_week.id; end if;

    update plan_weeks
    set week_number = next_week_number + week_offset + 1,
        start_date = first_start_date + (week_offset * 7),
        end_date = first_start_date + (week_offset * 7) + 6,
        updated_at = now()
    where id = target_week.id;

    week_offset := week_offset + 1;
  end loop;

  if target_week_id is null then raise exception 'Paused program has no unscheduled weeks'; end if;

  update programs
  set status = 'active', updated_at = now()
  where id = target_program_id and user_id = caller_id;

  return target_week_id;
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
  perform private.lock_user_plan_weeks(caller_id);
  if length(btrim(program_name)) = 0 then raise exception 'Program name is required'; end if;

  perform pause_active_program(caller_id);

  insert into programs (user_id, name, status)
  values (caller_id, btrim(program_name), 'active')
  returning id into new_program_id;

  return new_program_id;
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
  perform private.lock_user_plan_weeks(auth.uid());
  perform pause_active_program(auth.uid());
end;
$$;

create or replace function public.pause_active_program(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.lock_user_plan_weeks(p_user_id);

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

create or replace function public.sync_program_status()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
begin
  if caller_id is null then raise exception 'Not authenticated'; end if;
  perform private.lock_user_plan_weeks(caller_id);

  update programs program
  set status = 'completed', updated_at = now()
  where program.user_id = caller_id
    and program.status = 'active'
    and exists (
      select 1
      from plan_weeks week
      where week.program_id = program.id
        and week.program_sequence >= program.total_weeks
    )
    and not exists (
      select 1
      from plan_weeks week
      where week.program_id = program.id
        and week.start_date is not null
        and week.end_date >= current_date
    );
end;
$$;

create or replace function private.lock_plan_week_schedule_write()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if tg_op = 'INSERT' then
    perform private.lock_user_plan_weeks(new.user_id);
    return new;
  elsif tg_op = 'DELETE' then
    perform private.lock_user_plan_weeks(old.user_id);
    return old;
  end if;

  if old.user_id is distinct from new.user_id then
    if old.user_id < new.user_id then
      perform private.lock_user_plan_weeks(old.user_id);
      perform private.lock_user_plan_weeks(new.user_id);
    else
      perform private.lock_user_plan_weeks(new.user_id);
      perform private.lock_user_plan_weeks(old.user_id);
    end if;
  elsif old.program_id is distinct from new.program_id
     or old.program_sequence is distinct from new.program_sequence
     or old.week_number is distinct from new.week_number
     or old.start_date is distinct from new.start_date
     or old.end_date is distinct from new.end_date then
    perform private.lock_user_plan_weeks(new.user_id);
  end if;

  return new;
end;
$$;

create or replace function private.lock_program_continuation_write()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if tg_op = 'INSERT' then
    perform private.lock_user_plan_weeks(new.user_id);
    return new;
  elsif tg_op = 'DELETE' then
    perform private.lock_user_plan_weeks(old.user_id);
    return old;
  end if;

  if old.user_id is distinct from new.user_id then
    if old.user_id < new.user_id then
      perform private.lock_user_plan_weeks(old.user_id);
      perform private.lock_user_plan_weeks(new.user_id);
    else
      perform private.lock_user_plan_weeks(new.user_id);
      perform private.lock_user_plan_weeks(old.user_id);
    end if;
  elsif old.status is distinct from new.status
     or old.is_default is distinct from new.is_default
     or old.language is distinct from new.language then
    perform private.lock_user_plan_weeks(new.user_id);
  end if;

  return new;
end;
$$;

revoke all on function private.lock_plan_week_schedule_write() from public, anon, authenticated;
revoke all on function private.lock_program_continuation_write() from public, anon, authenticated;

drop trigger if exists plan_weeks_schedule_lock on public.plan_weeks;
create trigger plan_weeks_schedule_lock
before insert or delete or update of user_id, program_id, program_sequence, week_number, start_date, end_date
on public.plan_weeks
for each row execute function private.lock_plan_week_schedule_write();

drop trigger if exists programs_continuation_lock on public.programs;
create trigger programs_continuation_lock
before insert or delete or update of user_id, status, is_default, language
on public.programs
for each row execute function private.lock_program_continuation_write();

commit;