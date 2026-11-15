begin;

-- NULL means the original row only recorded rounded minutes. Do not invent
-- second precision for imported or previously saved practice history.
alter table public.session_blocks
  add column if not exists actual_seconds integer;

do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'public.session_blocks'::regclass
      and conname = 'session_blocks_actual_seconds_nonnegative'
  ) then
    alter table public.session_blocks
      add constraint session_blocks_actual_seconds_nonnegative
      check (actual_seconds is null or actual_seconds >= 0);
  end if;
end;
$$;

comment on column public.session_blocks.actual_seconds is
  'Absolute practiced seconds. NULL retains legacy minute-only precision; no inferred backfill.';

commit;
