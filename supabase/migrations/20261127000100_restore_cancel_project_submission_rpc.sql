create or replace function public.cancel_project_submission(p_submission_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor text := auth.uid()::text;
  v_submission public.project_submissions%rowtype;
begin
  if v_actor is null then
    raise exception 'Sign in to cancel a submission.';
  end if;

  select * into v_submission
  from public.project_submissions
  where id = p_submission_id
  for update;

  if not found or v_submission.submitter_id <> v_actor then
    raise exception 'Submission not found.';
  end if;

  if v_submission.status not in ('pending', 'changes_requested') then
    raise exception 'This submission can no longer be cancelled.';
  end if;

  delete from public.project_submissions where id = p_submission_id;

  insert into public.admin_audit(actor_id, action, target_table, target_id, detail)
  values (
    v_actor,
    'cancel',
    'project_submissions',
    p_submission_id::text,
    jsonb_build_object('app_id', v_submission.app_id, 'type', v_submission.submission_type)::text
  );
end;
$$;

revoke all on function public.cancel_project_submission(uuid) from public, anon;
grant execute on function public.cancel_project_submission(uuid) to authenticated;
