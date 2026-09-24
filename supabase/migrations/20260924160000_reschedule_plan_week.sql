-- Allow editing a week range while pushing conflicting later weeks forward.

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

grant execute on function public.reschedule_plan_week(uuid, date, date) to authenticated;
