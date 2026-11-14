-- Preserve existing usernames, URLs and mentions while adding a non-unique full name.
alter table public.profiles add column if not exists full_name text;
update public.profiles set full_name = name where full_name is null;
alter table public.profiles drop constraint if exists profiles_full_name_length;
alter table public.profiles add constraint profiles_full_name_length
  check (full_name is null or char_length(btrim(full_name)) between 1 and 100);

-- Existing usernames retain their links. Enforce the rule on new accounts and renames.
create or replace function public.validate_profile_username()
returns trigger language plpgsql set search_path = public as $$
begin
  if TG_OP = 'UPDATE' then
    if new.name is not distinct from old.name then return new; end if;
  end if;
  if new.name !~ '^[A-Za-z0-9][A-Za-z0-9_-]{1,28}[A-Za-z0-9]$' then
    raise exception 'Use 3–30 characters: letters, numbers, underscores or hyphens, starting and ending with a letter or number.';
  end if;
  return new;
end;
$$;
drop trigger if exists validate_profile_username on public.profiles;
create trigger validate_profile_username before insert or update of name on public.profiles
  for each row execute function public.validate_profile_username();


-- Hyphens are username characters, so a mention must include the whole handle.
create or replace function public.bind_mentions(content text, previous jsonb default '[]'::jsonb)
returns jsonb language sql stable set search_path = public as $$
  with candidates as (
    select m->>'name' as name, m->>'userId' as user_id, 0 as priority
    from jsonb_array_elements(coalesce(previous, '[]'::jsonb)) m
    union all
    select name, id, 1 from public.profiles
  ), hits as (
    select distinct on (pos) pos,
      substring(content from pos + 1 for length(c.name)) as name, c.user_id
    from candidates c
    cross join lateral generate_series(1, length(content)) pos
    where c.name <> '' and substring(content from pos for 1) = '@'
      and lower(substring(content from pos + 1 for length(c.name))) = lower(c.name)
      and (pos = 1 or substring(content from pos - 1 for 1) !~ '[[:alnum:]_@-]')
      and substring(content from pos + length(c.name) + 1 for 1) !~ '[[:alnum:]_-]'
    order by pos, length(c.name) desc, c.priority, c.user_id
  ), matches as (
    select distinct on (lower(name)) name, user_id from hits order by lower(name), pos
  )
  select coalesce(jsonb_agg(jsonb_build_object('name', name, 'userId', user_id)), '[]'::jsonb)
  from matches;
$$;
