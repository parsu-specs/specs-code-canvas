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
