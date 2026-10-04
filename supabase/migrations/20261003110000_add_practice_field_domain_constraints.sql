begin;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'songs_status_domain_check'
      and conrelid = 'public.songs'::regclass
  ) then
    alter table public.songs
      add constraint songs_status_domain_check
      check (status in ('planned', 'learning', 'maintained', 'retired'))
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'sessions_source_domain_check'
      and conrelid = 'public.sessions'::regclass
  ) then
    alter table public.sessions
      add constraint sessions_source_domain_check
      check (source in ('app', 'notion_import'))
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'block_templates_key_domain_check'
      and conrelid = 'public.block_templates'::regclass
  ) then
    alter table public.block_templates
      add constraint block_templates_key_domain_check
      check (key in ('warmup', 'technique', 'rhythm', 'harmony', 'repertoire', 'evening', 'learning'))
      not valid;
  end if;
end;
$$;

alter table public.songs
  validate constraint songs_status_domain_check;
alter table public.sessions
  validate constraint sessions_source_domain_check;
alter table public.block_templates
  validate constraint block_templates_key_domain_check;

commit;