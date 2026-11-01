begin;

-- Item 63 (APIContract DuplicateWeek v1): copy a scheduled week directly after itself.
-- Shifting/renumbering and per-user serialization mirror insert_plan_week (20261006120000).
create or replace function public.duplicate_plan_week(p_week_id uuid)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  caller_id uuid := auth.uid();
  source_week public.plan_weeks%rowtype;
  duration_days int;
  new_start_date date;
  inserted_week_id uuid;
begin
  if caller_id is null then raise exception 'Not authenticated'; end if;
  if p_week_id is null then raise exception 'Plan week not found'; end if;
  perform private.lock_user_plan_weeks(caller_id);

  select week.* into source_week
  from public.plan_weeks week
  where week.id = p_week_id and week.user_id = caller_id;
  if not found then raise exception 'Plan week not found'; end if;
  if source_week.week_number is null
     or source_week.start_date is null
     or source_week.end_date is null then
    raise exception 'Only scheduled plan weeks can be duplicated';
  end if;

  duration_days := source_week.end_date - source_week.start_date + 1;
  new_start_date := source_week.end_date + 1;

  update public.plan_weeks set week_number = 100000 + week_number
  where user_id = caller_id and week_number > source_week.week_number;

  insert into public.plan_weeks (
    user_id, program_id, program_sequence, week_number, start_date, end_date, focus, tasks
  ) values (
    caller_id, source_week.program_id,
    coalesce((select max(program_sequence) from public.plan_weeks where program_id = source_week.program_id), 0) + 1,
    source_week.week_number + 1,
    new_start_date,
    new_start_date + duration_days - 1,
    source_week.focus,
    source_week.tasks
  ) returning id into inserted_week_id;

  insert into public.todos (week_id, name, source, done, sort_order)
  select inserted_week_id, todo.name, todo.source, false, todo.sort_order
  from public.todos todo
  where todo.week_id = p_week_id;

  insert into public.plan_week_blocks (week_id, block_key, sort_order)
  select inserted_week_id, membership.block_key, membership.sort_order
  from public.plan_week_blocks membership
  where membership.week_id = p_week_id;

  insert into public.week_songs (week_id, song_id, sort_order)
  select inserted_week_id, link.song_id, link.sort_order
  from public.week_songs link
  where link.week_id = p_week_id;

  update public.plan_weeks
  set week_number = (week_number - 100000) + 1,
      start_date = start_date + duration_days,
      end_date = end_date + duration_days,
      updated_at = now()
  where user_id = caller_id and week_number >= 100000;

  return inserted_week_id;
end;
$$;

revoke all on function public.duplicate_plan_week(uuid) from public, anon;
grant execute on function public.duplicate_plan_week(uuid) to authenticated;

commit;
