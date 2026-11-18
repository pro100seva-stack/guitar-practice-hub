-- YouTube links and practice metadata only; uploaded file bytes remain device-local.
begin;

create schema if not exists youtube_material_private;
revoke all on schema youtube_material_private from public, anon, authenticated;

create or replace function youtube_material_private.valid_metadata(p_bookmarks jsonb, p_loops jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare
  item jsonb;
  seconds numeric;
  loop_ids text[] := array[]::text[];
begin
  if pg_catalog.jsonb_typeof(p_bookmarks) is distinct from 'array'
    or pg_catalog.jsonb_typeof(p_loops) is distinct from 'array'
    or pg_catalog.octet_length(p_bookmarks::text) + pg_catalog.octet_length(p_loops::text) > 1048576 then return false; end if;
  for item in select value from pg_catalog.jsonb_array_elements(p_bookmarks) loop
    if pg_catalog.jsonb_typeof(item) = 'number' then seconds := item::text::numeric;
    elsif pg_catalog.jsonb_typeof(item) = 'object' and pg_catalog.jsonb_typeof(item->'seconds') = 'number' then
      seconds := (item->>'seconds')::numeric;
      if item ? 'name' and (pg_catalog.jsonb_typeof(item->'name') <> 'string' or pg_catalog.length(item->>'name') > 60) then return false; end if;
    else return false; end if;
    if seconds < 0 or seconds > 90071992547409.90 then return false; end if;
  end loop;
  for item in select value from pg_catalog.jsonb_array_elements(p_loops) loop
    if pg_catalog.jsonb_typeof(item) <> 'object'
      or pg_catalog.jsonb_typeof(item->'id') is distinct from 'string'
      or (item->>'id') !~ '^[A-Za-z0-9_-]{1,128}$'
      or (item->>'id') = any(loop_ids)
      or pg_catalog.jsonb_typeof(item->'start') is distinct from 'number'
      or pg_catalog.jsonb_typeof(item->'end') is distinct from 'number'
      or pg_catalog.jsonb_typeof(item->'name') is distinct from 'string'
      or pg_catalog.length(item->>'name') > 60
      or pg_catalog.jsonb_typeof(item->'color') is distinct from 'number'
      or pg_catalog.jsonb_typeof(item->'order') is distinct from 'number' then return false; end if;
    if (item->>'start')::numeric < 0 or (item->>'end')::numeric <= (item->>'start')::numeric
      or (item->>'end')::numeric > 90071992547409.90
      or pg_catalog.trunc((item->>'start')::numeric * 100) <> (item->>'start')::numeric * 100
      or pg_catalog.trunc((item->>'end')::numeric * 100) <> (item->>'end')::numeric * 100
      or (item->>'color')::numeric not between 0 and 7
      or pg_catalog.trunc((item->>'color')::numeric) <> (item->>'color')::numeric
      or (item->>'order')::numeric not between 0 and 9007199254740991
      or pg_catalog.trunc((item->>'order')::numeric) <> (item->>'order')::numeric then return false; end if;
    if item ? 'repeats' then
      if pg_catalog.jsonb_typeof(item->'repeats') <> 'number' then return false; end if;
      if (item->>'repeats')::numeric not between 1 and 999
        or pg_catalog.trunc((item->>'repeats')::numeric) <> (item->>'repeats')::numeric then return false; end if;
    end if;
    loop_ids := pg_catalog.array_append(loop_ids, item->>'id');
  end loop;
  return true;
end;
$$;
revoke all on function youtube_material_private.valid_metadata(jsonb, jsonb) from public, anon, authenticated;

create table if not exists public.youtube_materials (
  user_id uuid not null references auth.users(id) on delete cascade,
  material_id text not null check (material_id ~ '^[A-Za-z0-9_-]{1,128}$'),
  block_key text not null check (pg_catalog.length(pg_catalog.btrim(block_key)) between 1 and 200),
  song_id uuid references public.songs(id) on delete cascade,
  video_id text not null check (video_id ~ '^[A-Za-z0-9_-]{11}$'),
  start_seconds integer not null default 0 check (start_seconds between 0 and 86400),
  name text not null check (pg_catalog.length(pg_catalog.btrim(name)) between 1 and 500),
  bookmarks jsonb not null default '[]'::jsonb,
  loops jsonb not null default '[]'::jsonb,
  looper_open boolean not null default false,
  revision bigint not null default 1 check (revision between 1 and 9007199254740991),
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  deleted_at timestamptz,
  primary key (user_id, material_id),
  constraint youtube_material_scope check ((block_key = 'song') = (song_id is not null)),
  constraint youtube_material_metadata check (youtube_material_private.valid_metadata(bookmarks, loops))
);
create index if not exists youtube_materials_owner_scope_idx on public.youtube_materials(user_id, block_key, song_id);
alter table public.youtube_materials enable row level security;
revoke all on table public.youtube_materials from public, anon, authenticated;
grant select on table public.youtube_materials to authenticated;
drop policy if exists youtube_materials_owner_select on public.youtube_materials;
create policy youtube_materials_owner_select on public.youtube_materials for select to authenticated
  using ((select auth.uid()) = user_id);

-- CAS writes are available only here; direct browser writes cannot bypass revisions.
create or replace function public.save_youtube_material(
  p_material_id text,
  p_expected_revision bigint,
  p_payload jsonb,
  p_delete boolean default false
) returns public.youtube_materials
language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  current_row public.youtube_materials;
  saved public.youtube_materials;
  song uuid;
  created timestamptz;
  block text;
  title text;
  v_bookmarks jsonb;
  v_loops jsonb;
  v_start integer;
begin
  if owner_id is null then raise exception using errcode = '42501', message = 'Authentication required'; end if;
  if p_material_id is null or p_material_id !~ '^[A-Za-z0-9_-]{1,128}$'
    or p_expected_revision is null or p_expected_revision < 0 or p_expected_revision >= 9007199254740991
    or p_delete is null or pg_catalog.jsonb_typeof(p_payload) is distinct from 'object'
    or pg_catalog.octet_length(p_payload::text) > 1048576 then
    raise exception using errcode = '22023', message = 'Invalid YouTube material';
  end if;
  if pg_catalog.jsonb_typeof(p_payload->'user_id') is distinct from 'string'
    or (p_payload->>'user_id') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
    raise exception using errcode = '22023', message = 'Invalid YouTube material owner';
  end if;
  -- Bind offline work to the original account even if the client auth token changed.
  if (p_payload->>'user_id')::uuid <> owner_id then
    raise exception using errcode = '42501', message = 'YouTube material owner mismatch';
  end if;
  block := p_payload->>'block_key';
  title := pg_catalog.btrim(p_payload->>'name');
  v_bookmarks := coalesce(p_payload->'bookmarks', '[]'::jsonb);
  v_loops := coalesce(p_payload->'loops', '[]'::jsonb);
  if pg_catalog.jsonb_typeof(p_payload->'block_key') is distinct from 'string'
    or pg_catalog.length(pg_catalog.btrim(block)) not between 1 and 200
    or pg_catalog.jsonb_typeof(p_payload->'video_id') is distinct from 'string'
    or (p_payload->>'video_id') !~ '^[A-Za-z0-9_-]{11}$'
    or pg_catalog.jsonb_typeof(p_payload->'name') is distinct from 'string'
    or pg_catalog.length(title) not between 1 and 500
    or (p_payload ? 'looper_open' and pg_catalog.jsonb_typeof(p_payload->'looper_open') <> 'boolean')
    or not youtube_material_private.valid_metadata(v_bookmarks, v_loops) then
    raise exception using errcode = '22023', message = 'Invalid YouTube material';
  end if;
  if p_payload ? 'start_seconds' then
    if pg_catalog.jsonb_typeof(p_payload->'start_seconds') <> 'number' then
      raise exception using errcode = '22023', message = 'Invalid YouTube material start';
    end if;
    if (p_payload->>'start_seconds')::numeric not between 0 and 86400
      or pg_catalog.trunc((p_payload->>'start_seconds')::numeric) <> (p_payload->>'start_seconds')::numeric then
      raise exception using errcode = '22023', message = 'Invalid YouTube material start';
    end if;
  end if;
  v_start := coalesce((p_payload->>'start_seconds')::integer, 0);
  begin
    song := nullif(p_payload->>'song_id', '')::uuid;
    created := coalesce((p_payload->>'created_at')::timestamptz, pg_catalog.now());
  exception when others then raise exception using errcode = '22023', message = 'Invalid YouTube material'; end;
  if not pg_catalog.isfinite(created) then raise exception using errcode = '22023', message = 'Invalid YouTube material'; end if;
  if (block = 'song') <> (song is not null) then raise exception using errcode = '22023', message = 'Invalid YouTube material scope'; end if;
  if song is not null then
    perform 1 from public.songs where id = song and user_id = owner_id for key share;
    if not found then raise exception using errcode = '42501', message = 'Song not found or not owned by user'; end if;
  end if;
  -- Serialize first inserts too, so two devices cannot both create revision1.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(owner_id::text || ':' || p_material_id, 0));
  select * into current_row from public.youtube_materials where user_id = owner_id and material_id = p_material_id for update;
  if found then
    if current_row.deleted_at is not null or current_row.revision <> p_expected_revision then
      raise exception using errcode = 'P0001', message = 'YOUTUBE_MATERIAL_CONFLICT';
    end if;
    update public.youtube_materials set block_key = block, song_id = song, video_id = p_payload->>'video_id', start_seconds = v_start, name = title,
      bookmarks = v_bookmarks, loops = v_loops,
      looper_open = coalesce((p_payload->>'looper_open')::boolean, false), revision = current_row.revision + 1,
      updated_at = pg_catalog.now(), deleted_at = case when p_delete then pg_catalog.now() else null end
      where user_id = owner_id and material_id = p_material_id returning * into saved;
  else
    if p_expected_revision <> 0 then raise exception using errcode = 'P0001', message = 'YOUTUBE_MATERIAL_CONFLICT'; end if;
    insert into public.youtube_materials(user_id, material_id, block_key, song_id, video_id, start_seconds, name, bookmarks, loops, looper_open, revision, created_at, deleted_at)
      values (owner_id, p_material_id, block, song, p_payload->>'video_id', v_start, title, v_bookmarks, v_loops,
        coalesce((p_payload->>'looper_open')::boolean, false), 1, created, case when p_delete then pg_catalog.now() else null end)
      returning * into saved;
  end if;
  return saved;
end;
$$;
revoke all on function public.save_youtube_material(text, bigint, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.save_youtube_material(text, bigint, jsonb, boolean) to authenticated;

comment on table public.youtube_materials is 'Owned YouTube link metadata; deleted rows are tombstones and cannot be resurrected by stale devices.';
comment on function public.save_youtube_material(text, bigint, jsonb, boolean) is 'Authenticated owner-only compare-and-swap metadata write. Direct browser writes are revoked.';
notify pgrst, 'reload schema';
commit;
