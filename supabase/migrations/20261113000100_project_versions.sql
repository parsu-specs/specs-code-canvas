-- Apply after the existing project/auth/image migrations.
alter table public.apps add column if not exists stage text;
alter table public.apps add column if not exists version text;
alter table public.apps add column if not exists last_published_at timestamptz;
alter table public.apps add column if not exists publication_id uuid;
alter table public.apps add column if not exists publication_notes text;
alter table public.apps drop constraint if exists apps_stage_valid;
alter table public.apps add constraint apps_stage_valid check (stage is null or stage in ('Concept', 'Visual prototype', 'Working prototype', 'Beta', 'Released'));
alter table public.apps drop constraint if exists apps_version_valid;
alter table public.apps add constraint apps_version_valid check (version is null or (length(version) <= 40 and version ~ '^v?[0-9]+(\.[0-9]+){0,2}(-[a-zA-Z0-9.-]+)?$'));
create table if not exists public.project_versions (
  id uuid primary key default gen_random_uuid(),
  app_id text not null references public.apps(id) on delete cascade,
  stage text,
  version text,
  notes text not null check (length(btrim(notes)) between 1 and 2000),
  published_at timestamptz not null default clock_timestamp(),
  snapshot jsonb not null
);
create unique index if not exists project_versions_label on public.project_versions (app_id, regexp_replace(version, '^v', '')) where version is not null;
create index if not exists project_versions_timeline on public.project_versions (app_id, published_at desc);
alter table public.project_versions enable row level security;
drop policy if exists "public read project versions" on public.project_versions;
create policy "public read project versions" on public.project_versions for select using (true);
grant select on public.project_versions to anon, authenticated;
revoke insert, update, delete on public.project_versions from anon, authenticated;
-- The outer apps write still uses owner RLS. Only this trigger writes history,
-- in the same transaction, so failures cannot leave a partially published version.
create or replace function public.capture_project_version()
returns trigger language plpgsql security definer set search_path = public
as $$
declare publish boolean;
begin
  if tg_op = 'INSERT' then
    publish := true;
    new.publication_id := gen_random_uuid();
    new.publication_notes := 'Initial publication';
  else
    publish := new.publication_id is distinct from old.publication_id;
    if not publish and new.version is distinct from old.version then
      raise exception 'Publish an update to change the version.';
    end if;
    if not publish then
      new.last_published_at := old.last_published_at;
      new.publication_notes := old.publication_notes;
    end if;
    if publish and (new.stage is null or nullif(btrim(new.version), '') is null) then
      raise exception 'Choose a stage and version for this update.';
    end if;
  end if;
  if publish then
    if nullif(btrim(new.publication_notes), '') is null or length(btrim(new.publication_notes)) > 2000 then
      raise exception 'Describe what changed in 1 to 2000 characters.';
    end if;
    new.last_published_at := clock_timestamp();
  end if;
  return new;
end;
$$;
revoke all on function public.capture_project_version() from public;
drop trigger if exists prepare_project_version on public.apps;
create trigger prepare_project_version before insert or update on public.apps for each row execute function public.capture_project_version();
create or replace function public.save_project_version()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.publication_id is distinct from old.publication_id then
    insert into public.project_versions (app_id, stage, version, notes, published_at, snapshot)
    values (new.id, new.stage, new.version, btrim(new.publication_notes), new.last_published_at,
      jsonb_build_object('title', new.title, 'description', new.description, 'screenshots', new.screenshots,
        'docs', new.docs, 'url', new.url, 'repoUrl', new.repo_url));
  end if;
  return new;
end;
$$;
revoke all on function public.save_project_version() from public;
drop trigger if exists save_project_version on public.apps;
create trigger save_project_version after insert or update on public.apps for each row execute function public.save_project_version();
-- Keep immutable images while any published snapshot still uses them.
create or replace function public.project_image_is_referenced(p_cover_url text)
returns boolean language sql stable security invoker set search_path = public
as $$
  select exists (
    select 1 from public.apps a
    cross join lateral jsonb_array_elements_text(a.screenshots) image(src)
    where split_part(split_part(image.src, '#', 1), '?', 1) = p_cover_url
  ) or exists (
    select 1 from public.project_versions v
    cross join lateral jsonb_array_elements_text(coalesce(v.snapshot->'screenshots', '[]'::jsonb)) image(src)
    where split_part(split_part(image.src, '#', 1), '?', 1) = p_cover_url
  );
$$;
revoke all on function public.project_image_is_referenced(text) from public;
grant execute on function public.project_image_is_referenced(text) to authenticated, service_role;
