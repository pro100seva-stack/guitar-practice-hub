-- Resume every remaining saved week of a paused program consecutively.

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

grant execute on function public.resume_program(uuid) to authenticated;
