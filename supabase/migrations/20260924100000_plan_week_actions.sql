-- Keep multi-row plan edits atomic and owner-scoped.

create or replace function public.add_plan_week(
  p_start_date date,
  p_end_date date,
  p_phase text,
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
    user_id, week_number, start_date, end_date, phase, focus, tasks
  ) values (
    caller_id, next_week_number, p_start_date, p_end_date, p_phase, p_focus, p_tasks
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

create or replace function public.remove_plan_week(p_week_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  remaining_count int;
  next_week_id uuid;
begin
  if caller_id is null then raise exception 'Not authenticated'; end if;

  select count(*)
  into remaining_count
  from plan_weeks
  where user_id = caller_id and week_number is not null;

  if remaining_count <= 1 then raise exception 'At least one plan week must remain'; end if;
  if not exists (
    select 1 from plan_weeks
    where id = p_week_id and user_id = caller_id and week_number is not null
  ) then raise exception 'Plan week not found'; end if;

  delete from plan_weeks where id = p_week_id and user_id = caller_id;

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

grant execute on function public.add_plan_week(date, date, text, text, text, uuid) to authenticated;
grant execute on function public.remove_plan_week(uuid) to authenticated;