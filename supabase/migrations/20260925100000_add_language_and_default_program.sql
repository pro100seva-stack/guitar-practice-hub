alter table public.app_settings
  add column if not exists language text not null default 'en';

alter table public.programs
  add column if not exists is_default boolean not null default false;

update public.programs
set is_default = true
where name = 'Default Practice Program';

alter table public.app_settings
  add constraint app_settings_language_check
  check (language in ('en', 'ru', 'it', 'fr'));