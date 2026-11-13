-- Apply to the MAIN Supabase project after the public account-role migration
-- and the console's admin moderation migration. Re-runnable.
-- Every selected profile and its audit entry are saved in one transaction.
create or replace function public.admin_set_account_roles(p_ids text[], p_role text)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_actor text := auth.uid()::text;
  v_count integer;
begin
  if v_actor is null or not exists (select 1 from public.admins where user_id = v_actor) then
    raise exception 'Administrator access is required.';
  end if;
  if p_role is null or p_role not in ('Guest', 'Member') then
    raise exception 'Choose Guest or Member.';
  end if;
  if coalesce(cardinality(p_ids), 0) not between 1 and 25
    or exists (select 1 from unnest(p_ids) id where id is null or id = '' or trim(id) <> id or length(id) > 200)
    or (select count(distinct id) from unnest(p_ids) id) <> cardinality(p_ids) then
    raise exception 'Select between 1 and 25 distinct accounts.';
  end if;
  -- Lock in a stable order. Missing/deleted accounts abort the entire batch.
  perform id from public.profiles where id = any(p_ids) order by id for update;
  get diagnostics v_count = row_count;
  if v_count <> cardinality(p_ids) then
    raise exception 'An account no longer exists. Refresh the accounts and try again.';
  end if;
  insert into public.admin_audit(actor_id, action, target_table, target_id, detail)
    select v_actor, 'update', 'profiles', id,
      jsonb_build_object('role', p_role, 'previous_role', role, 'bulk', true)::text
    from public.profiles where id = any(p_ids);
  update public.profiles set role = p_role where id = any(p_ids);
  return v_count;
end;
$$;
revoke all on function public.admin_set_account_roles(text[], text) from public, anon;
grant execute on function public.admin_set_account_roles(text[], text) to authenticated;
