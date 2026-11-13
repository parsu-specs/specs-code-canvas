-- Freeze mention labels and user IDs. Apply before deploying the updated client.
begin;
alter table public.apps add column if not exists mentions jsonb;
alter table public.comments add column if not exists mentions jsonb;
-- Match literal names, not regex patterns, with whole-mention boundaries.
-- Prior bindings win over current names when editing an existing post.
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
      and (pos = 1 or substring(content from pos - 1 for 1) !~ '[[:alnum:]_@]')
      and substring(content from pos + length(c.name) + 1 for 1) !~ '[[:alnum:]_]'
    order by pos, length(c.name) desc, c.priority, c.user_id
  ), matches as (
    select distinct on (lower(name)) name, user_id from hits order by lower(name), pos
  )
  select coalesce(jsonb_agg(jsonb_build_object('name', name, 'userId', user_id)), '[]'::jsonb)
  from matches;
$$;
-- Only current names are recoverable for legacy posts; preserve original text.
update public.apps set mentions = public.bind_mentions(description) where mentions is null;
update public.comments set mentions = public.bind_mentions(body) where mentions is null;
alter table public.apps alter column mentions set default '[]'::jsonb;
alter table public.apps alter column mentions set not null;
alter table public.comments alter column mentions set default '[]'::jsonb;
alter table public.comments alter column mentions set not null;
create or replace function public.freeze_post_mentions()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_table_name = 'apps' then
    if tg_op = 'UPDATE' then
      new.mentions := public.bind_mentions(new.description, old.mentions);
    else
      new.mentions := public.bind_mentions(new.description);
    end if;
  else
    if tg_op = 'UPDATE' then
      new.mentions := public.bind_mentions(new.body, old.mentions);
    else
      new.mentions := public.bind_mentions(new.body);
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists apps_freeze_mentions on public.apps;
create trigger apps_freeze_mentions before insert or update of description on public.apps
for each row execute function public.freeze_post_mentions();
drop trigger if exists comments_freeze_mentions on public.comments;
create trigger comments_freeze_mentions before insert or update of body on public.comments
for each row execute function public.freeze_post_mentions();
commit;
