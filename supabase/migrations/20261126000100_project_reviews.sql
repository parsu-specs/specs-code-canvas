-- Project submission review gate. Submitters can create/read their own
-- submissions; only administrators can inspect the queue and decide reviews.
create table if not exists public.project_submissions (
  id uuid primary key default gen_random_uuid(),
  app_id text,
  submitter_id text not null,
  submission_type text not null check (submission_type in ('new', 'update')),
  status text not null default 'pending' check (status in ('pending', 'changes_requested', 'approved')),
  payload jsonb not null,
  feedback text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text
);
create index if not exists project_submissions_queue_idx
  on public.project_submissions (status, submitted_at desc);
create index if not exists project_submissions_submitter_idx
  on public.project_submissions (submitter_id, submitted_at desc);

alter table public.project_submissions enable row level security;
create or replace function public.can_review_project_submissions()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid()::text);
$$;
revoke all on function public.can_review_project_submissions() from public, anon;
grant execute on function public.can_review_project_submissions() to authenticated;

drop policy if exists "owners read own project submissions" on public.project_submissions;
drop policy if exists "owners submit projects for review" on public.project_submissions;
drop policy if exists "admins read project submissions" on public.project_submissions;
create policy "owners read own project submissions" on public.project_submissions
  for select to authenticated using (auth.uid()::text = submitter_id);
create policy "owners submit projects for review" on public.project_submissions
  for insert to authenticated with check (
    auth.uid()::text = submitter_id and (
      exists (select 1 from public.profiles where id = auth.uid()::text and role = 'Member')
      or public.can_review_project_submissions()
    )
  );
create policy "admins read project submissions" on public.project_submissions
  for select to authenticated using (public.can_review_project_submissions());
grant select, insert on public.project_submissions to authenticated;
revoke update, delete on public.project_submissions from anon, authenticated;

create or replace function public.review_project_submission(
  p_submission_id uuid,
  p_decision text,
  p_feedback text default null
) returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_actor text := auth.uid()::text;
  v_submission public.project_submissions%rowtype;
  v_payload jsonb;
begin
  if v_actor is null or not exists (select 1 from public.admins where user_id = v_actor) then
    raise exception 'Administrator access is required.';
  end if;
  if p_decision not in ('approve', 'request_changes') then
    raise exception 'Choose approve or request changes.';
  end if;
  if p_decision = 'request_changes' and length(btrim(coalesce(p_feedback, ''))) not between 1 and 2000 then
    raise exception 'Add reviewer feedback (1 to 2000 characters).';
  end if;
  select * into v_submission from public.project_submissions
    where id = p_submission_id for update;
  if not found or v_submission.status not in ('pending', 'changes_requested') then
    raise exception 'This submission is no longer awaiting review.';
  end if;
  if p_decision = 'request_changes' then
    update public.project_submissions set status = 'changes_requested',
      feedback = btrim(p_feedback), reviewed_at = now(), reviewed_by = v_actor
      where id = p_submission_id;
    insert into public.admin_audit(actor_id, action, target_table, target_id, detail)
      values (v_actor, 'request_changes', 'project_submissions', p_submission_id::text, btrim(p_feedback));
    return;
  end if;

  perform set_config('app.review_submission', 'on', true);
  v_payload := v_submission.payload;
  if v_submission.submission_type = 'new' then
    insert into public.apps (
      id, title, description, creator, creator_id, category, votes, color,
      url, repo_url, screenshots, docs, collaborators, icon, stage, version,
      publication_notes
    ) values (
      coalesce(v_submission.app_id, v_payload->>'id'), v_payload->>'title',
      v_payload->>'description', v_payload->>'creator', v_submission.submitter_id,
      v_payload->>'category', 0, coalesce(v_payload->>'color', 'sky'),
      nullif(v_payload->>'url', ''), nullif(v_payload->>'repo_url', ''),
      coalesce(v_payload->'screenshots', '[]'::jsonb), nullif(v_payload->>'docs', ''),
      coalesce(v_payload->'collaborators', '[]'::jsonb), nullif(v_payload->>'icon', ''),
      nullif(v_payload->>'stage', ''), nullif(v_payload->>'version', ''), 'Initial publication'
    );
  else
    update public.apps set
      title = v_payload->>'title', description = v_payload->>'description',
      category = v_payload->>'category', url = nullif(v_payload->>'url', ''),
      repo_url = nullif(v_payload->>'repo_url', ''),
      screenshots = coalesce(v_payload->'screenshots', '[]'::jsonb),
      docs = nullif(v_payload->>'docs', ''),
      collaborators = coalesce(v_payload->'collaborators', '[]'::jsonb),
      icon = nullif(v_payload->>'icon', ''), stage = v_payload->>'stage',
      version = v_payload->>'version', publication_id = gen_random_uuid(),
      publication_notes = v_payload->>'publication_notes'
    where id = v_submission.app_id;
    if not found then raise exception 'The project no longer exists.'; end if;
  end if;
  update public.project_submissions set status = 'approved', feedback = null,
    reviewed_at = now(), reviewed_by = v_actor where id = p_submission_id;
  insert into public.admin_audit(actor_id, action, target_table, target_id, detail)
    values (v_actor, 'approve', 'project_submissions', p_submission_id::text,
      jsonb_build_object('app_id', v_submission.app_id, 'type', v_submission.submission_type)::text);
end;
$$;
revoke all on function public.review_project_submission(uuid, text, text) from public, anon;
grant execute on function public.review_project_submission(uuid, text, text) to authenticated;

create or replace function public.cancel_project_submission(p_submission_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_actor text := auth.uid()::text;
  v_submission public.project_submissions%rowtype;
begin
  if v_actor is null then raise exception 'Sign in to cancel a submission.'; end if;
  select * into v_submission from public.project_submissions
    where id = p_submission_id for update;
  if not found or v_submission.submitter_id <> v_actor then
    raise exception 'Submission not found.';
  end if;
  if v_submission.status not in ('pending', 'changes_requested') then
    raise exception 'This submission can no longer be cancelled.';
  end if;
  delete from public.project_submissions where id = p_submission_id;
  insert into public.admin_audit(actor_id, action, target_table, target_id, detail)
    values (v_actor, 'cancel', 'project_submissions', p_submission_id::text,
      jsonb_build_object('app_id', v_submission.app_id, 'type', v_submission.submission_type)::text);
end;
$$;
revoke all on function public.cancel_project_submission(uuid) from public, anon;
grant execute on function public.cancel_project_submission(uuid) to authenticated;

create or replace function public.enforce_project_review_gate()
returns trigger language plpgsql security invoker set search_path = public
as $$
begin
  if current_setting('app.review_submission', true) is distinct from 'on' then
    if tg_op = 'INSERT' then
      raise exception 'Projects and published updates must be submitted for admin review.';
    elsif new.publication_id is distinct from old.publication_id then
      raise exception 'Projects and published updates must be submitted for admin review.';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_project_review_gate() from public;
drop trigger if exists enforce_project_review_gate on public.apps;
create trigger enforce_project_review_gate
  before insert or update on public.apps
  for each row execute function public.enforce_project_review_gate();
