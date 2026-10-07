begin;

alter table public.block_templates
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists category_key text,
  add column if not exists is_selectable boolean not null default true,
  add column if not exists archived_at timestamptz;

alter table public.block_templates
  alter column target_minutes drop not null,
  drop constraint if exists block_templates_key_domain_check;

update public.block_templates
set category_key = case key
  when 'warmup' then 'technique_warmups'
  when 'technique' then 'technique_warmups'
  when 'rhythm' then 'chords_rhythm'
  when 'harmony' then 'improvisation_composition'
  when 'repertoire' then 'repertoire_songwork'
  when 'evening' then 'repertoire_songwork'
  else 'other'
end,
is_selectable = (key <> 'warmup')
where category_key is null or (key = 'warmup' and is_selectable);

alter table public.block_templates
  alter column category_key set not null,
  alter column category_key set default 'other',
  drop constraint if exists block_templates_category_key_check,
  drop constraint if exists block_templates_custom_blocks_are_other_check,
  add constraint block_templates_category_key_check
    check (category_key in (
      'technique_warmups', 'chords_rhythm', 'scales_fretboard',
      'ear_training', 'repertoire_songwork',
      'improvisation_composition', 'other'
    )),
  add constraint block_templates_custom_blocks_are_other_check
    check (user_id is null or category_key = 'other');

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.block_templates'::regclass
      and conname = 'block_templates_key_key'
  ) then
    alter table public.block_templates
      add constraint block_templates_key_key unique (key);
  end if;
end;
$$;

insert into public.block_templates
  (phase, key, label, target_minutes, description, sort_order, category_key, is_selectable)
values
  ('common', 'chromatic', 'Chromatic', 10, null, 1, 'technique_warmups', true),
  ('common', 'two_notes_per_string', '2 notes per string', 15, null, 2, 'technique_warmups', true),
  ('common', 'alternate_picking', 'Alternate picking', 15, null, 3, 'technique_warmups', true),
  ('common', 'legato', 'Legato', 15, null, 4, 'technique_warmups', true),
  ('common', 'chord_changes', 'Chord changes', 15, null, 1, 'chords_rhythm', true),
  ('common', 'barre_chords', 'Barre chords', 15, null, 2, 'chords_rhythm', true),
  ('common', 'strumming_patterns', 'Strumming patterns', 15, null, 3, 'chords_rhythm', true),
  ('common', 'major_scales', 'Major scales', 15, null, 1, 'scales_fretboard', true),
  ('common', 'minor_scales', 'Minor scales', 15, null, 2, 'scales_fretboard', true),
  ('common', 'pentatonic_scales', 'Pentatonic scales', 15, null, 3, 'scales_fretboard', true),
  ('common', 'notes_fretboard', 'Notes on the fretboard', 15, null, 4, 'scales_fretboard', true),
  ('common', 'notes', 'Notes', 10, null, 1, 'ear_training', true),
  ('common', 'intervals', 'Intervals', 10, null, 2, 'ear_training', true),
  ('common', 'chords', 'Chords', 10, null, 3, 'ear_training', true),
  ('common', 'learn_song', 'Learn a new song', 20, null, 1, 'repertoire_songwork', true),
  ('common', 'jam_track', 'Jam to track', 15, null, 1, 'improvisation_composition', true),
  ('common', 'songwriting', 'Songwriting', 20, null, 2, 'improvisation_composition', true)
on conflict (key) do nothing;

update public.block_templates
set category_key = case key
  when 'warmup' then 'technique_warmups'
  when 'technique' then 'technique_warmups'
  when 'rhythm' then 'chords_rhythm'
  when 'harmony' then 'improvisation_composition'
  when 'repertoire' then 'repertoire_songwork'
  when 'evening' then 'repertoire_songwork'
  else 'other'
end,
is_selectable = (key <> 'warmup')
where user_id is null and key in ('warmup', 'technique', 'rhythm', 'harmony', 'repertoire', 'evening', 'learning');

alter table public.programs
  add column if not exists block_set_mode text not null default 'legacy_unconfigured';

alter table public.programs
  drop constraint if exists programs_block_set_mode_check,
  add constraint programs_block_set_mode_check
    check (block_set_mode in ('legacy_unconfigured', 'same_every_week', 'varies_by_week'));

create table if not exists public.program_blocks (
  program_id uuid not null references public.programs(id) on delete cascade,
  block_key text not null references public.block_templates(key),
  sort_order integer not null check (sort_order > 0),
  primary key (program_id, block_key),
  unique (program_id, sort_order)
);

create table if not exists public.plan_week_blocks (
  week_id uuid not null references public.plan_weeks(id) on delete cascade,
  block_key text not null references public.block_templates(key),
  sort_order integer not null check (sort_order > 0),
  primary key (week_id, block_key),
  unique (week_id, sort_order)
);

alter table public.block_templates enable row level security;
alter table public.program_blocks enable row level security;
alter table public.plan_week_blocks enable row level security;

drop policy if exists "block_templates_read_all" on public.block_templates;
create policy "block_templates_catalog_read" on public.block_templates
  for select using (
    is_selectable
    and archived_at is null
    and (user_id is null or user_id = auth.uid())
  );

drop policy if exists "program_blocks_owner_select" on public.program_blocks;
create policy "program_blocks_owner_select" on public.program_blocks
  for select using (
    exists (
      select 1 from public.programs p
      where p.id = program_blocks.program_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "plan_week_blocks_owner_select" on public.plan_week_blocks;
create policy "plan_week_blocks_owner_select" on public.plan_week_blocks
  for select using (
    exists (
      select 1 from public.plan_weeks w
      where w.id = plan_week_blocks.week_id and w.user_id = auth.uid()
    )
  );

revoke all on table public.block_templates, public.program_blocks, public.plan_week_blocks
  from public, anon, authenticated;
grant select on table public.block_templates, public.program_blocks, public.plan_week_blocks
  to authenticated;
grant select, insert, update, delete on table public.block_templates,
  public.program_blocks, public.plan_week_blocks to service_role;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.validate_catalog_block_keys(p_user_id uuid, p_block_keys text[])
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if p_block_keys is null or cardinality(p_block_keys) = 0
     or coalesce(array_ndims(p_block_keys), 0) <> 1 then
    raise exception 'At least one block key is required' using errcode = '22023';
  end if;
  if exists (select 1 from unnest(p_block_keys) as item(key) where item.key is null) then
    raise exception 'Block keys cannot contain null values' using errcode = '22023';
  end if;
  if cardinality(p_block_keys) <> (select count(distinct item.key) from unnest(p_block_keys) as item(key)) then
    raise exception 'Duplicate block keys are not allowed' using errcode = '22023';
  end if;
  if cardinality(p_block_keys) <> (
    select count(*)
    from unnest(p_block_keys) as requested(key)
    join public.block_templates block
      on block.key = requested.key
     and block.is_selectable
     and block.archived_at is null
     and (block.user_id is null or block.user_id = p_user_id)
  ) then
    raise exception 'Unknown, archived, or unavailable block key' using errcode = '22023';
  end if;
end;
$$;

create or replace function private.write_program_blocks(p_program_id uuid, p_block_keys text[])
returns void
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $$
begin
  delete from public.program_blocks where program_id = p_program_id;
  insert into public.program_blocks (program_id, block_key, sort_order)
  select p_program_id, requested.key, requested.ordinality::integer
  from unnest(p_block_keys) with ordinality as requested(key, ordinality)
  join public.block_templates block on block.key = requested.key;
end;
$$;

create or replace function private.write_plan_week_blocks(p_week_id uuid, p_block_keys text[])
returns void
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $$
begin
  delete from public.plan_week_blocks where week_id = p_week_id;
  insert into public.plan_week_blocks (week_id, block_key, sort_order)
  select p_week_id, requested.key, requested.ordinality::integer
  from unnest(p_block_keys) with ordinality as requested(key, ordinality)
  join public.block_templates block on block.key = requested.key;
end;
$$;

revoke all on function private.validate_catalog_block_keys(uuid, text[]) from public, anon, authenticated;
revoke all on function private.write_program_blocks(uuid, text[]) from public, anon, authenticated;
revoke all on function private.write_plan_week_blocks(uuid, text[]) from public, anon, authenticated;

create or replace function private.guard_program_block_set_mode()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if new.block_set_mode is distinct from old.block_set_mode
     and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'Use set_program_block_mode to change block composition';
  end if;
  return new;
end;
$$;

revoke all on function private.guard_program_block_set_mode() from public, anon, authenticated;
drop trigger if exists programs_block_set_mode_rpc_only on public.programs;
create trigger programs_block_set_mode_rpc_only
  before update of block_set_mode on public.programs
  for each row execute function private.guard_program_block_set_mode();

create or replace function public.create_other_block(p_label text)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  caller_id uuid := auth.uid();
  new_key text;
begin
  if caller_id is null then raise exception 'Not authenticated'; end if;
  if p_label is null or length(btrim(p_label)) = 0 or length(btrim(p_label)) > 80 then
    raise exception 'Block label must contain between 1 and 80 characters' using errcode = '22023';
  end if;

  new_key := 'other_' || replace(gen_random_uuid()::text, '-', '');
  insert into public.block_templates (phase, key, label, target_minutes, sort_order, user_id, category_key)
  values ('common', new_key, btrim(p_label), null, 0, caller_id, 'other');
  return new_key;
end;
$$;

create or replace function public.replace_program_blocks(p_program_id uuid, p_block_keys text[])
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  caller_id uuid := auth.uid();
  current_mode text;
begin
  if caller_id is null then raise exception 'Not authenticated'; end if;
  select block_set_mode into current_mode
  from public.programs
  where id = p_program_id and user_id = caller_id
  for update;
  if not found then raise exception 'Program not found'; end if;
  if current_mode <> 'same_every_week' then
    raise exception 'Program blocks can only be replaced in same_every_week mode';
  end if;
  perform private.validate_catalog_block_keys(caller_id, p_block_keys);
  perform private.write_program_blocks(p_program_id, p_block_keys);
end;
$$;

create or replace function public.replace_plan_week_blocks(p_week_id uuid, p_block_keys text[])
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  caller_id uuid := auth.uid();
begin
  if caller_id is null then raise exception 'Not authenticated'; end if;
  if not exists (
    select 1 from public.plan_weeks week
    join public.programs program on program.id = week.program_id
    where week.id = p_week_id and week.user_id = caller_id
      and program.user_id = caller_id and program.block_set_mode = 'varies_by_week'
  ) then
    raise exception 'Varying-program week not found';
  end if;
  perform private.validate_catalog_block_keys(caller_id, p_block_keys);
  perform private.write_plan_week_blocks(p_week_id, p_block_keys);
end;
$$;

create or replace function public.set_program_block_mode(
  p_program_id uuid,
  p_mode text,
  p_shared_block_keys text[] default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  caller_id uuid := auth.uid();
  current_mode text;
  program_keys text[];
  chosen_keys text[];
  week_keys text[];
  has_weeks boolean := false;
  week_row record;
begin
  if caller_id is null then raise exception 'Not authenticated'; end if;
  if p_mode is null or p_mode not in ('legacy_unconfigured', 'same_every_week', 'varies_by_week') then
    raise exception 'Invalid block set mode' using errcode = '22023';
  end if;

  select block_set_mode into current_mode
  from public.programs where id = p_program_id and user_id = caller_id for update;
  if not found then raise exception 'Program not found'; end if;
  if p_shared_block_keys is not null then
    perform private.validate_catalog_block_keys(caller_id, p_shared_block_keys);
  end if;

  select coalesce(array_agg(membership.block_key order by membership.sort_order), '{}'::text[])
  into program_keys
  from public.program_blocks membership
  where membership.program_id = p_program_id;
  chosen_keys := program_keys;

  if p_mode = 'legacy_unconfigured' then
    if current_mode <> 'legacy_unconfigured' then
      raise exception 'A configured program cannot return to legacy_unconfigured';
    end if;
    return;
  elsif p_mode = 'same_every_week' then
    if current_mode = 'varies_by_week' then
      chosen_keys := null;
      for week_row in
        select id from public.plan_weeks where program_id = p_program_id order by program_sequence
      loop
        has_weeks := true;
        select coalesce(array_agg(membership.block_key order by membership.sort_order), '{}'::text[])
        into week_keys
        from public.plan_week_blocks membership
        where membership.week_id = week_row.id;
        if chosen_keys is null then
          chosen_keys := week_keys;
        elsif chosen_keys is distinct from week_keys and p_shared_block_keys is null then
          raise exception 'Week block sets differ; provide p_shared_block_keys to use a shared set';
        end if;
      end loop;
      if p_shared_block_keys is not null then
        chosen_keys := p_shared_block_keys;
      elsif not has_weeks then
        chosen_keys := program_keys;
        if cardinality(chosen_keys) = 0 then
          raise exception 'Provide p_shared_block_keys to configure this program';
        end if;
      elsif cardinality(chosen_keys) = 0 and p_shared_block_keys is null then
        raise exception 'Provide p_shared_block_keys to configure this program';
      end if;
    elsif current_mode = 'legacy_unconfigured' then
      if p_shared_block_keys is null then
        raise exception 'Provide p_shared_block_keys to configure this program';
      end if;
      chosen_keys := p_shared_block_keys;
    elsif p_shared_block_keys is not null then
      chosen_keys := p_shared_block_keys;
    end if;

    perform private.validate_catalog_block_keys(caller_id, chosen_keys);
    perform private.write_program_blocks(p_program_id, chosen_keys);
    delete from public.plan_week_blocks membership
    using public.plan_weeks week
    where membership.week_id = week.id and week.program_id = p_program_id;
  else
    if current_mode = 'legacy_unconfigured' then
      if p_shared_block_keys is null then
        raise exception 'Provide p_shared_block_keys to configure this program';
      end if;
      chosen_keys := p_shared_block_keys;
      perform private.write_program_blocks(p_program_id, chosen_keys);
    elsif current_mode = 'same_every_week' then
      if p_shared_block_keys is not null and p_shared_block_keys is distinct from chosen_keys then
        raise exception 'The shared block set must be preserved when enabling varying weeks';
      end if;
      if cardinality(chosen_keys) = 0 then
        raise exception 'Provide p_shared_block_keys to configure this program';
      end if;
    elsif p_shared_block_keys is not null then
      raise exception 'The program already varies by week';
    else
      return;
    end if;
    perform private.validate_catalog_block_keys(caller_id, chosen_keys);
    for week_row in
      select id from public.plan_weeks where program_id = p_program_id order by program_sequence
    loop
      perform private.write_plan_week_blocks(week_row.id, chosen_keys);
    end loop;
  end if;

  update public.programs
  set block_set_mode = p_mode, updated_at = now()
  where id = p_program_id and user_id = caller_id;
end;
$$;

drop function if exists public.add_plan_week(date, date, uuid, text, text, uuid);
create or replace function public.add_plan_week(
  p_start_date date,
  p_end_date date,
  p_program_id uuid,
  p_focus text,
  p_tasks text,
  p_insert_after_week_id uuid default null,
  p_block_keys text[] default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  caller_id uuid := auth.uid();
  program_mode text;
  insert_after_week_number int;
  current_max_week_number int;
  next_week_number int;
  duration_days int;
  inserted_week_id uuid;
begin
  if caller_id is null then raise exception 'Not authenticated'; end if;
  perform private.lock_user_plan_weeks(caller_id);
  if p_end_date < p_start_date then raise exception 'Week end date must be on or after the start date'; end if;
  select block_set_mode into program_mode
  from public.programs where id = p_program_id and user_id = caller_id;
  if not found then raise exception 'Program not found'; end if;
  if program_mode = 'varies_by_week' then
    perform private.validate_catalog_block_keys(caller_id, p_block_keys);
  elsif p_block_keys is not null then
    raise exception 'Block keys are accepted only for varies_by_week programs';
  end if;

  select max(week_number) into current_max_week_number
  from public.plan_weeks where user_id = caller_id and week_number is not null;
  if p_insert_after_week_id is null then
    insert_after_week_number := coalesce(current_max_week_number, 0);
  else
    select week_number into insert_after_week_number
    from public.plan_weeks
    where id = p_insert_after_week_id and user_id = caller_id and week_number is not null;
    if insert_after_week_number is null then raise exception 'Plan week not found'; end if;
  end if;

  next_week_number := insert_after_week_number + 1;
  duration_days := p_end_date - p_start_date + 1;
  update public.plan_weeks set week_number = 100000 + week_number
  where user_id = caller_id and week_number > insert_after_week_number;

  insert into public.plan_weeks (
    user_id, program_id, program_sequence, week_number, start_date, end_date, focus, tasks
  ) values (
    caller_id, p_program_id,
    coalesce((select max(program_sequence) from public.plan_weeks where program_id = p_program_id), 0) + 1,
    next_week_number, p_start_date, p_end_date, p_focus, p_tasks
  ) returning id into inserted_week_id;

  if program_mode = 'varies_by_week' then
    perform private.write_plan_week_blocks(inserted_week_id, p_block_keys);
  end if;
  update public.plan_weeks
  set week_number = (week_number - 100000) + 1,
      start_date = start_date + duration_days,
      end_date = end_date + duration_days,
      updated_at = now()
  where user_id = caller_id and week_number >= 100000;

  perform public.pause_active_program(caller_id);
  return inserted_week_id;
end;
$$;

drop function if exists public.insert_plan_week(date, date, uuid, text, text, uuid);
create or replace function public.insert_plan_week(
  p_start_date date,
  p_end_date date,
  p_program_id uuid,
  p_focus text,
  p_tasks text,
  p_insert_after_week_id uuid,
  p_block_keys text[] default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  caller_id uuid := auth.uid();
  program_mode text;
  insert_after_week_number int;
  next_week_number int;
  duration_days int;
  inserted_week_id uuid;
begin
  if caller_id is null then raise exception 'Not authenticated'; end if;
  perform private.lock_user_plan_weeks(caller_id);
  if p_end_date < p_start_date then raise exception 'Week end date must be on or after the start date'; end if;
  select block_set_mode into program_mode
  from public.programs where id = p_program_id and user_id = caller_id;
  if not found then raise exception 'Program not found'; end if;
  if program_mode = 'varies_by_week' then
    perform private.validate_catalog_block_keys(caller_id, p_block_keys);
  elsif p_block_keys is not null then
    raise exception 'Block keys are accepted only for varies_by_week programs';
  end if;

  select week_number into insert_after_week_number
  from public.plan_weeks
  where id = p_insert_after_week_id and user_id = caller_id and week_number is not null;
  if insert_after_week_number is null then raise exception 'Plan week not found'; end if;
  next_week_number := insert_after_week_number + 1;
  duration_days := p_end_date - p_start_date + 1;

  update public.plan_weeks set week_number = 100000 + week_number
  where user_id = caller_id and week_number > insert_after_week_number;
  insert into public.plan_weeks (
    user_id, program_id, program_sequence, week_number, start_date, end_date, focus, tasks
  ) values (
    caller_id, p_program_id,
    coalesce((select max(program_sequence) from public.plan_weeks where program_id = p_program_id), 0) + 1,
    next_week_number, p_start_date, p_end_date, p_focus, p_tasks
  ) returning id into inserted_week_id;
  if program_mode = 'varies_by_week' then
    perform private.write_plan_week_blocks(inserted_week_id, p_block_keys);
  end if;
  update public.plan_weeks
  set week_number = (week_number - 100000) + 1,
      start_date = start_date + duration_days,
      end_date = end_date + duration_days,
      updated_at = now()
  where user_id = caller_id and week_number >= 100000;
  return inserted_week_id;
end;
$$;

create or replace function public.assign_plan_week_program(p_week_id uuid, p_program_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  caller_id uuid := auth.uid();
  next_sequence int;
  target_mode text;
begin
  if caller_id is null then raise exception 'Not authenticated'; end if;
  perform private.lock_user_plan_weeks(caller_id);
  if not exists (select 1 from public.plan_weeks where id = p_week_id and user_id = caller_id) then
    raise exception 'Plan week not found';
  end if;
  select block_set_mode into target_mode from public.programs
  where id = p_program_id and user_id = caller_id;
  if not found then raise exception 'Program not found'; end if;

  select coalesce(max(program_sequence), 0) + 1 into next_sequence
  from public.plan_weeks where program_id = p_program_id;
  update public.plan_weeks
  set program_id = p_program_id, program_sequence = next_sequence, updated_at = now()
  where id = p_week_id and user_id = caller_id;
  if target_mode <> 'varies_by_week' then
    delete from public.plan_week_blocks where week_id = p_week_id;
  end if;
end;
$$;

revoke all on function public.create_other_block(text) from public, anon;
revoke all on function public.set_program_block_mode(uuid, text, text[]) from public, anon;
revoke all on function public.replace_program_blocks(uuid, text[]) from public, anon;
revoke all on function public.replace_plan_week_blocks(uuid, text[]) from public, anon;
revoke all on function public.add_plan_week(date, date, uuid, text, text, uuid, text[]) from public, anon;
revoke all on function public.insert_plan_week(date, date, uuid, text, text, uuid, text[]) from public, anon;
revoke all on function public.assign_plan_week_program(uuid, uuid) from public, anon;
grant execute on function public.create_other_block(text) to authenticated;
grant execute on function public.set_program_block_mode(uuid, text, text[]) to authenticated;
grant execute on function public.replace_program_blocks(uuid, text[]) to authenticated;
grant execute on function public.replace_plan_week_blocks(uuid, text[]) to authenticated;
grant execute on function public.add_plan_week(date, date, uuid, text, text, uuid, text[]) to authenticated;
grant execute on function public.insert_plan_week(date, date, uuid, text, text, uuid, text[]) to authenticated;
grant execute on function public.assign_plan_week_program(uuid, uuid) to authenticated;

commit;