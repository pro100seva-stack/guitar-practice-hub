-- Removing a plan week must reverse both its numbering and its date shift.

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

grant execute on function public.remove_plan_week(uuid) to authenticated;