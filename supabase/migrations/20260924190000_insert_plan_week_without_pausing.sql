-- Insert a week into an existing schedule without pausing the active program.

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

grant execute on function public.insert_plan_week(date, date, uuid, text, text, uuid) to authenticated;
