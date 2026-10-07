begin;

alter table public.week_songs
  add column if not exists sort_order integer;

with missing_orders as (
  select
    link.week_id,
    link.song_id,
    coalesce((
      select max(existing.sort_order)
      from public.week_songs existing
      where existing.week_id = link.week_id
        and existing.sort_order is not null
    ), 0)
      + row_number() over (partition by link.week_id order by link.song_id)::integer as sort_order
  from public.week_songs link
  where link.sort_order is null
)
update public.week_songs link
set sort_order = missing_orders.sort_order
from missing_orders
where link.week_id = missing_orders.week_id
  and link.song_id = missing_orders.song_id;

alter table public.week_songs
  alter column sort_order set not null;

create unique index if not exists week_songs_week_sort_order_idx
  on public.week_songs (week_id, sort_order);

drop policy if exists "week_songs_owner_insert" on public.week_songs;
drop policy if exists "week_songs_owner_delete" on public.week_songs;

revoke all on table public.week_songs from public, anon, authenticated;
grant select on table public.week_songs to authenticated;

create or replace function public.replace_week_repertoire_songs(
  p_week_id uuid,
  p_song_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, auth, pg_temp
as $$
declare
  caller_id uuid := auth.uid();
begin
  if caller_id is null then
    raise exception using errcode = 'P0001', message = 'Not authenticated';
  end if;

  perform 1
  from public.plan_weeks week
  where week.id = p_week_id
    and week.user_id = caller_id
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'Plan week not found';
  end if;

  if p_song_ids is null then
    raise exception using errcode = '22023', message = 'Song IDs cannot be null';
  end if;
  if exists (
    select 1
    from unnest(p_song_ids) as requested(song_id)
    where requested.song_id is null
  ) then
    raise exception using errcode = '22023', message = 'Song IDs cannot contain null values';
  end if;
  if cardinality(p_song_ids) <> (
    select count(distinct requested.song_id)
    from unnest(p_song_ids) as requested(song_id)
  ) then
    raise exception using errcode = '22023', message = 'Duplicate song IDs are not allowed';
  end if;
  if exists (
    select 1
    from unnest(p_song_ids) as requested(song_id)
    left join public.songs song
      on song.id = requested.song_id
     and song.user_id = caller_id
    where song.id is null
  ) then
    raise exception using errcode = '22023', message = 'Song not found or not owned by user';
  end if;

  delete from public.week_songs
  where week_id = p_week_id;

  insert into public.week_songs (week_id, song_id, sort_order)
  select p_week_id, requested.song_id, requested.ordinality::integer
  from unnest(p_song_ids) with ordinality as requested(song_id, ordinality);
end;
$$;

revoke all on function public.replace_week_repertoire_songs(uuid, uuid[])
  from public, anon, authenticated;
grant execute on function public.replace_week_repertoire_songs(uuid, uuid[])
  to authenticated;

commit;