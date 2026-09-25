alter table public.programs
  add column if not exists language text not null default 'en';

update public.programs
set language = 'en'
where is_default = true;

alter table public.programs
  add constraint programs_language_check
  check (language in ('en', 'ru', 'it', 'fr'));