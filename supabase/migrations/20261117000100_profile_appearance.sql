-- Account appearance preference. Null preserves existing device preferences.
alter table public.profiles add column if not exists appearance text;

alter table public.profiles drop constraint if exists profiles_appearance_check;
alter table public.profiles add constraint profiles_appearance_check
  check (appearance is null or appearance in ('light', 'dark', 'system'));
