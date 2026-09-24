-- Mark active programs completed after their prescribed sequence has ended.

create or replace function public.sync_program_status()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;

  update programs program
  set status = 'completed', updated_at = now()
  where program.user_id = auth.uid()
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

grant execute on function public.sync_program_status() to authenticated;
