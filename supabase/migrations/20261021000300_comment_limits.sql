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
