-- Reassign a week to another owned program without violating sequence uniqueness.

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

grant execute on function public.assign_plan_week_program(uuid, uuid) to authenticated;
