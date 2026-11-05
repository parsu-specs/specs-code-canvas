-- Specs App Store — Supabase schema.
-- Mirrors the localStorage prototype stores 1:1 so cutover is mechanical.
-- Run in the Supabase SQL editor. Requires pgcrypto for gen_random_uuid().
--
-- Stores replaced by these tables:
--   cc.apps.v1        -> apps (+ app_votes for votes/viewerHasVoted)
--   cc.profiles.v1    -> profiles
--   cc.comments.v1    -> comments (parent_id self-ref for nested replies)
--                      + comment_likes (likes/viewerHasLiked)
--   cc.milestones.v1  -> milestones + milestone_cheers
--   cc.session / mock users -> Supabase Auth (auth.users), linked by id
--
-- Project screenshots use public Storage cover URLs; older inline images remain valid.
-- The project-images bucket and owner policies are configured below. Docs remain text.

create extension if not exists "pgcrypto";

-- ── Profiles ──────────────────────────────────────────────────────────────
create table if not exists profiles (
  id text primary key, -- matches auth user id (mock/google ids during prototype)
  name text not null,
  role text not null default 'SPECS member',
  bio text not null default '',
  color text not null default 'sky',
  image_url text,
  theme text,
  palette text,
  created_at timestamptz not null default now()
);

-- ── Apps ──────────────────────────────────────────────────────────────────
create table if not exists apps (
  id text primary key,
  title text not null,
  description text not null,
  creator text not null,
  creator_id text,
  category text not null,
  votes integer not null default 0,
  color text not null,
  url text,
  repo_url text,
  screenshots jsonb not null default '[]',
  docs text,
  collaborators jsonb not null default '[]',
  created_at timestamptz not null default now()
);

-- One row per upvote. votes column is a cached count; viewerHasVoted = own row exists.
create table if not exists app_votes (
  app_id text not null references apps (id) on delete cascade,
  user_id text not null,
  created_at timestamptz not null default now(),
  primary key (app_id, user_id)
);

-- ── Comments (nested replies via parent_id) ───────────────────────────────
create table if not exists comments (
  id text primary key,
  app_id text not null, -- real app id, or 'ms:<milestoneId>' for wall threads
  author_id text not null,
  author_name text not null,
  body text not null,
  parent_id text references comments (id) on delete cascade,
  likes integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists comment_likes (
  comment_id text not null references comments (id) on delete cascade,
  user_id text not null,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

-- ── Milestones wall ───────────────────────────────────────────────────────
create table if not exists milestones (
  id text primary key,
  author_id text not null,
  author_name text not null,
  body text not null,
  app_id text references apps (id) on delete set null,
  cheers integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists milestone_cheers (
  milestone_id text not null references milestones (id) on delete cascade,
  user_id text not null,
  created_at timestamptz not null default now(),
  primary key (milestone_id, user_id)
);

-- ── Row Level Security ────────────────────────────────────────────────────
-- Prototype stance: everyone reads everything; only owners mutate.
-- Tighten (e.g. moderation roles) before real users arrive.
alter table profiles enable row level security;
alter table apps enable row level security;
alter table app_votes enable row level security;
alter table comments enable row level security;
alter table comment_likes enable row level security;
alter table milestones enable row level security;
alter table milestone_cheers enable row level security;

-- Policies are dropped first because Postgres has no CREATE POLICY IF NOT
-- EXISTS — this keeps the whole file safe to rerun on an existing database.
drop policy if exists "public read profiles" on profiles;
drop policy if exists "public read apps" on apps;
drop policy if exists "public read app_votes" on app_votes;
drop policy if exists "public read comments" on comments;
drop policy if exists "public read comment_likes" on comment_likes;
drop policy if exists "public read milestones" on milestones;
drop policy if exists "public read milestone_cheers" on milestone_cheers;
drop policy if exists "owners manage profiles" on profiles;
drop policy if exists "owners manage apps" on apps;
drop policy if exists "signed-in insert app_votes" on app_votes;
drop policy if exists "own delete app_votes" on app_votes;
drop policy if exists "signed-in insert comments" on comments;
drop policy if exists "own delete comments" on comments;
drop policy if exists "signed-in insert comment_likes" on comment_likes;
drop policy if exists "own delete comment_likes" on comment_likes;
drop policy if exists "signed-in insert milestones" on milestones;
drop policy if exists "signed-in insert milestone_cheers" on milestone_cheers;
drop policy if exists "own delete milestone_cheers" on milestone_cheers;

-- Public read for all content tables.
create policy "public read profiles" on profiles for select using (true);
create policy "public read apps" on apps for select using (true);
create policy "public read app_votes" on app_votes for select using (true);
create policy "public read comments" on comments for select using (true);
create policy "public read comment_likes" on comment_likes for select using (true);
create policy "public read milestones" on milestones for select using (true);
create policy "public read milestone_cheers" on milestone_cheers for select using (true);

-- Owners manage their own rows. auth.uid() must equal the row's owner id,
-- so Google/mock ids must be reconciled with auth.users at cutover.
create policy "owners manage profiles" on profiles
  for all using (auth.uid()::text = id) with check (auth.uid()::text = id);
create policy "owners manage apps" on apps
  for all using (auth.uid()::text = creator_id) with check (auth.uid()::text = creator_id);

-- Any signed-in user may vote/like/cheer/comment as THEMSELVES; the row's
-- author_id/user_id must equal the caller (see migration_authorship.sql).
-- Removal of one's own row only.
create policy "signed-in insert app_votes" on app_votes
  for insert with check (auth.role() = 'authenticated' and auth.uid()::text = user_id);
create policy "own delete app_votes" on app_votes
  for delete using (auth.uid()::text = user_id);
create policy "signed-in insert comments" on comments
  for insert with check (auth.role() = 'authenticated' and auth.uid()::text = author_id);
create policy "own delete comments" on comments
  for delete using (auth.uid()::text = author_id);
create policy "signed-in insert comment_likes" on comment_likes
  for insert with check (auth.role() = 'authenticated' and auth.uid()::text = user_id);
create policy "own delete comment_likes" on comment_likes
  for delete using (auth.uid()::text = user_id);
create policy "signed-in insert milestones" on milestones
  for insert with check (auth.role() = 'authenticated' and auth.uid()::text = author_id);
create policy "signed-in insert milestone_cheers" on milestone_cheers
  for insert with check (auth.role() = 'authenticated' and auth.uid()::text = user_id);
create policy "own delete milestone_cheers" on milestone_cheers
  for delete using (auth.uid()::text = user_id);

-- ── Input validation (mirrors the repo-layer limits) ─────────────────────
-- Existing databases get these from migration_constraints.sql instead.
-- Drops first so this file stays rerunnable like the policies above.
alter table apps drop constraint if exists apps_title_length;
alter table apps add constraint apps_title_length
  check (char_length(title) between 1 and 80);
alter table apps drop constraint if exists apps_description_length;
alter table apps add constraint apps_description_length
  check (char_length(description) between 1 and 280);
alter table apps drop constraint if exists apps_docs_length;
alter table apps add constraint apps_docs_length
  check (docs is null or char_length(docs) <= 50000);
alter table apps drop constraint if exists apps_category_valid;
alter table apps add constraint apps_category_valid
  check (category in ('Education', 'Productivity', 'Games', 'Creative'));
alter table apps drop constraint if exists apps_votes_nonnegative;
alter table apps add constraint apps_votes_nonnegative
  check (votes >= 0);
alter table apps drop constraint if exists apps_url_protocol;
alter table apps add constraint apps_url_protocol
  check (url is null or url ilike 'http://%' or url ilike 'https://%');
alter table apps drop constraint if exists apps_repo_url_protocol;
alter table apps add constraint apps_repo_url_protocol
  check (repo_url is null or repo_url ilike 'http://%' or repo_url ilike 'https://%');

alter table comments drop constraint if exists comments_body_length;
alter table comments add constraint comments_body_length
  check (char_length(body) between 1 and 500);
alter table comments drop constraint if exists comments_likes_nonnegative;
alter table comments add constraint comments_likes_nonnegative
  check (likes >= 0);

alter table milestones drop constraint if exists milestones_body_length;
alter table milestones add constraint milestones_body_length
  check (char_length(body) between 1 and 280);
alter table milestones drop constraint if exists milestones_cheers_nonnegative;
alter table milestones add constraint milestones_cheers_nonnegative
  check (cheers >= 0);

alter table profiles drop constraint if exists profiles_name_length;
alter table profiles add constraint profiles_name_length
  check (char_length(name) between 1 and 40);
alter table profiles drop constraint if exists profiles_role_length;
alter table profiles add constraint profiles_role_length
  check (char_length(role) between 1 and 80);
alter table profiles drop constraint if exists profiles_bio_length;
alter table profiles add constraint profiles_bio_length
  check (char_length(bio) <= 280);
alter table profiles drop constraint if exists profiles_color_valid;
alter table profiles add constraint profiles_color_valid
  check (color in ('yellow', 'mint', 'pink', 'sky', 'lavender', 'purple', 'paper', 'surface'));
alter table profiles drop constraint if exists profiles_theme_valid;
alter table profiles add constraint profiles_theme_valid
  check (theme is null or theme in ('pink', 'yellow', 'mint', 'sky', 'lavender', 'purple', 'black'));
alter table profiles drop constraint if exists profiles_palette_valid;
alter table profiles add constraint profiles_palette_valid
  check (palette is null or palette in ('candy', 'ocean', 'sunset', 'forest', 'mono', 'bubblegum', 'citrus', 'grape', 'midnight'));

-- profiles.name is UNIQUE (case-insensitive): one display name per developer,
-- enforced by profiles_lower_name_unique below. screenshots/collaborators
-- stay schemaless.

-- ── Helpful indexes ───────────────────────────────────────────────────────
create index if not exists apps_creator_idx on apps (creator_id);
create index if not exists comments_app_idx on comments (app_id, created_at);
create index if not exists comments_parent_idx on comments (parent_id);
create index if not exists milestones_created_idx on milestones (created_at desc);
-- One display name per developer (mirrors migration_unique_names.sql).
create unique index if not exists profiles_lower_name_unique
  on profiles (lower(btrim(name)));

-- Allow authors to delete their own feed updates. Cheers cascade by foreign key.
drop policy if exists "own delete milestones" on milestones;
create policy "own delete milestones" on milestones
  for delete using (auth.uid()::text = author_id);

-- Feed comment threads use text IDs rather than a milestone foreign key.
create or replace function public.delete_milestone_thread()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.comments where app_id = 'ms:' || old.id;
  return old;
end;
$$;

drop trigger if exists delete_milestone_thread on milestones;
create trigger delete_milestone_thread
  after delete on milestones
  for each row execute function public.delete_milestone_thread();

-- Preserve deleted comments only while replies still depend on them.
alter table public.comments add column if not exists is_deleted boolean not null default false;

-- Deletion goes through the function so replies cannot be cascaded by a client.
drop policy if exists "own delete comments" on public.comments;

create or replace function public.delete_comment(p_app_id text, p_comment_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.comments%rowtype;
  ancestor_id text;
  next_ancestor_id text;
begin
  select * into target from public.comments where id = p_comment_id for update;
  if not found then raise exception 'Comment not found.'; end if;
  if auth.uid() is null or target.author_id <> auth.uid()::text then
    raise exception 'You can only delete your own comments.';
  end if;
  if target.app_id <> p_app_id then raise exception 'That comment belongs to another thread.'; end if;

  if exists (select 1 from public.comments where parent_id = target.id) then
    delete from public.comment_likes where comment_id = target.id;
    update public.comments set body = 'Deleted comment', is_deleted = true, likes = 0 where id = target.id;
  else
    ancestor_id := target.parent_id;
    delete from public.comments where id = target.id;
    -- A deleted ancestor with no remaining replies no longer needs a placeholder.
    while ancestor_id is not null loop
      select parent_id into next_ancestor_id from public.comments
        where id = ancestor_id and is_deleted for update;
      exit when not found;
      exit when exists (select 1 from public.comments where parent_id = ancestor_id);
      delete from public.comments where id = ancestor_id;
      ancestor_id := next_ancestor_id;
    end loop;
  end if;
end;
$$;

revoke all on function public.delete_comment(text, text) from public;
grant execute on function public.delete_comment(text, text) to authenticated;

-- Requires the comment-placeholder migration. Four levels include the root.
-- Apply after legacy counter/rate-limit migrations; these triggers also guard
-- direct table writes and the existing toggle_comment_like RPC.
create or replace function public.guard_comment_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted boolean;
begin
  -- Serialize with delete_comment, which locks this same comment before cleanup.
  select is_deleted into deleted from public.comments
    where id = new.comment_id for update;
  if not found then raise exception 'Comment not found.'; end if;
  if deleted then raise exception 'This comment has been deleted.'; end if;
  return new;
end;
$$;

drop trigger if exists guard_comment_like on public.comment_likes;
create trigger guard_comment_like
  before insert or update on public.comment_likes
  for each row execute function public.guard_comment_like();

create or replace function public.guard_comment_depth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ancestor_id text := new.parent_id;
  ancestor public.comments%rowtype;
  comment_level integer := 1;
begin
  -- Moving a parent would also change the depth/thread of every descendant.
  if tg_op = 'UPDATE' then
    if new.parent_id is distinct from old.parent_id or new.app_id <> old.app_id then
      raise exception 'Comments cannot be moved to another parent or thread.';
    end if;
    return new;
  end if;
  while ancestor_id is not null loop
    comment_level := comment_level + 1;
    if comment_level > 4 then raise exception 'Replies are limited to 4 levels.'; end if;
    if ancestor_id = new.id then raise exception 'A comment cannot reply to itself.'; end if;
    select * into ancestor from public.comments where id = ancestor_id for key share;
    if not found then raise exception 'That comment no longer exists.'; end if;
    if ancestor.app_id <> new.app_id then
      raise exception 'That comment belongs to another thread.';
    end if;
    ancestor_id := ancestor.parent_id;
  end loop;
  return new;
end;
$$;

drop trigger if exists guard_comment_depth on public.comments;
create trigger guard_comment_depth
  before insert or update of parent_id, app_id on public.comments
  for each row execute function public.guard_comment_depth();

-- Repair any reactions added to placeholders before this guard was installed.
delete from public.comment_likes using public.comments
  where comment_likes.comment_id = comments.id and comments.is_deleted;
update public.comments set likes = 0 where is_deleted and likes <> 0;

revoke all on function public.guard_comment_like() from public;
revoke all on function public.guard_comment_depth() from public;


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


-- Public project screenshots, with immutable thumbnail/cover objects per upload.
-- Run once for an existing project; no paid image-transformation service is used.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('project-images', 'project-images', true, 1048576,
        array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Project image owners can inspect" on storage.objects;
create policy "Project image owners can inspect" on storage.objects
for select to authenticated
using (bucket_id = 'project-images' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "Project image owners can upload" on storage.objects;
create policy "Project image owners can upload" on storage.objects
for insert to authenticated
with check (bucket_id = 'project-images' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "Project image owners can delete" on storage.objects;
create policy "Project image owners can delete" on storage.objects
for delete to authenticated
using (bucket_id = 'project-images' and (storage.foldername(name))[1] = (select auth.uid()::text));

-- Preserve public images reused by another project, including URLs without metadata.
create or replace function public.project_image_is_referenced(p_cover_url text)
returns boolean language sql stable security invoker set search_path = public
as $$
  select exists (
    select 1 from public.apps a
    cross join lateral jsonb_array_elements_text(a.screenshots) image(src)
    where split_part(split_part(image.src, '#', 1), '?', 1) = p_cover_url
  );
$$;
revoke all on function public.project_image_is_referenced(text) from public;
grant execute on function public.project_image_is_referenced(text) to authenticated, service_role;
