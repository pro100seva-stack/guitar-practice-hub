begin;

alter table public.songs add column if not exists archived_at timestamptz;

create table if not exists public.practice_day_songs (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  practice_date date not null,
  block_key text not null check (block_key in ('repertoire', 'learn_song')),
  song_id uuid not null references public.songs(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (user_id, practice_date, block_key, song_id)
);
create index if not exists practice_day_songs_song_id_idx on public.practice_day_songs(song_id);
alter table public.practice_day_songs enable row level security;
revoke all on table public.practice_day_songs from public, anon, authenticated;
grant select on table public.practice_day_songs to authenticated;
drop policy if exists practice_day_songs_owner_select on public.practice_day_songs;
create policy practice_day_songs_owner_select on public.practice_day_songs
  for select to authenticated using (
    user_id = auth.uid() and exists (
      select 1 from public.songs song
      where song.id = practice_day_songs.song_id and song.user_id = auth.uid()
    )
  );

create or replace function public.set_practice_day_song(
  p_practice_date date,
  p_block_key text,
  p_song_id uuid,
  p_selected boolean
)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  caller_id uuid := auth.uid();
  song_archived_at timestamptz;
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'Not authenticated';
  end if;
  if p_practice_date is null or p_block_key is null
     or p_block_key not in ('repertoire', 'learn_song')
     or p_song_id is null or p_selected is null then
    raise exception using errcode = '22023', message = 'Invalid practice song selection';
  end if;
  -- Selection and archival lock the same song, so an archive cannot race a new selection.
  select song.archived_at into song_archived_at
  from public.songs song where song.id = p_song_id and song.user_id = caller_id
  for update;
  if not found then
    raise exception using errcode = '42501', message = 'Song not found or not owned by user';
  end if;
  if p_selected then
    if song_archived_at is not null then
      raise exception using errcode = '22023', message = 'Archived songs cannot be selected';
    end if;
    insert into public.practice_day_songs(user_id, practice_date, block_key, song_id)
    values (caller_id, p_practice_date, p_block_key, p_song_id)
    on conflict do nothing;
  else
    delete from public.practice_day_songs
    where user_id = caller_id and practice_date = p_practice_date
      and block_key = p_block_key and song_id = p_song_id;
  end if;
end;
$$;

create or replace function public.create_practice_song(
  p_name text,
  p_practice_date date default null,
  p_block_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  caller_id uuid := auth.uid();
  normalized_name text := btrim(regexp_replace(p_name, '[[:space:]]+', ' ', 'g'));
  song_id uuid;
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'Not authenticated';
  end if;
  if normalized_name is null or char_length(normalized_name) = 0 or char_length(normalized_name) > 200 then
    raise exception using errcode = '22023', message = 'Song name must contain 1 to 200 characters';
  end if;
  if (p_practice_date is null) <> (p_block_key is null)
     or (p_block_key is not null and p_block_key not in ('repertoire', 'learn_song')) then
    raise exception using errcode = '22023', message = 'Provide a practice date and supported block together';
  end if;
  -- Existing duplicate rows stay distinct; repeat creation reuses the oldest active match.
  perform pg_advisory_xact_lock(hashtextextended('practice-song:' || caller_id::text || ':' || lower(normalized_name), 0));
  select song.id into song_id from public.songs song
  where song.user_id = caller_id and song.archived_at is null
    and lower(btrim(regexp_replace(song.name, '[[:space:]]+', ' ', 'g'))) = lower(normalized_name)
  order by song.created_at, song.id
  limit 1 for update;
  if not found then
    insert into public.songs(user_id, name, status)
    values (caller_id, normalized_name, 'learning') returning id into song_id;
  end if;
  if p_practice_date is not null then
    perform public.set_practice_day_song(p_practice_date, p_block_key, song_id, true);
  end if;
  return song_id;
end;
$$;

create or replace function public.archive_practice_song(p_song_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  caller_id uuid := auth.uid();
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'Not authenticated';
  end if;
  perform 1 from public.songs where id = p_song_id and user_id = caller_id for update;
  if not found then
    raise exception using errcode = '42501', message = 'Song not found or not owned by user';
  end if;
  update public.songs set archived_at = coalesce(archived_at, transaction_timestamp())
  where id = p_song_id and user_id = caller_id;
end;
$$;

revoke all on function public.set_practice_day_song(date, text, uuid, boolean) from public, anon, authenticated;
revoke all on function public.create_practice_song(text, date, text) from public, anon, authenticated;
revoke all on function public.archive_practice_song(uuid) from public, anon, authenticated;
grant execute on function public.set_practice_day_song(date, text, uuid, boolean) to authenticated;
grant execute on function public.create_practice_song(text, date, text) to authenticated;
grant execute on function public.archive_practice_song(uuid) to authenticated;

commit;
