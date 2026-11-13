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
