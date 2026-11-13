-- Shared with admin-app-store-specs. Apply to the main Supabase project.
-- Public account roles are Guest and Member. Console access is independently
-- stored in admins, never inferred from the formerly self-editable role text.
begin;

create table if not exists public.admins (
  user_id text primary key,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
-- Existing admin-console policies are preserved. No public write access.

create or replace function public.account_role_admin()
returns boolean language sql stable security definer set search_path = public
as $$
  select coalesce(auth.role() = 'service_role', false)
    or (auth.uid() is null and auth.role() is null
        and session_user in ('postgres', 'supabase_admin'))
    or exists (select 1 from public.admins where user_id = auth.uid()::text);
$$;
revoke all on function public.account_role_admin() from public;

-- The old role field was self-editable, so even "Member" cannot establish
-- approval. Reset once, before installing the account-role constraint. Later
-- migration reruns preserve approvals made through the console.
alter table public.profiles alter column role set default 'Guest';
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_account_role_valid'
  ) then
    update public.profiles set role = 'Guest' where role is distinct from 'Guest';
  end if;
end;
$$;
alter table public.profiles drop constraint if exists profiles_account_role_valid;
alter table public.profiles add constraint profiles_account_role_valid
  check (role in ('Guest', 'Member'));

create or replace function public.guard_profile_account_role()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if not public.account_role_admin() then
    if tg_op = 'INSERT' then
      if new.role is distinct from 'Guest' then
        raise exception 'New accounts must start as Guest. Member approval is managed in the admin console.';
      end if;
    elsif new.role is distinct from old.role then
      raise exception 'Account roles can only be changed in the admin console.';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.guard_profile_account_role() from public;
drop trigger if exists guard_profile_account_role on public.profiles;
create trigger guard_profile_account_role before insert or update on public.profiles
  for each row execute function public.guard_profile_account_role();

-- A trigger also enforces membership when permissive owner/admin RLS policies
-- coexist. Guest feed posting and existing content navigation are unaffected.
create or replace function public.guard_project_membership()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if not public.account_role_admin() and not exists (
    select 1 from public.profiles where id = auth.uid()::text and role = 'Member'
  ) then
    raise exception 'An admin must approve your account as a Member before you can submit projects.';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_project_membership() from public;
drop trigger if exists guard_project_membership on public.apps;
create trigger guard_project_membership before insert on public.apps
  for each row execute function public.guard_project_membership();

commit;
