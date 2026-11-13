-- Disposable PostgreSQL tests only: stand in for Supabase-managed Storage tables.
create role service_role bypassrls;
create role anon;
create schema storage;
create table storage.buckets (
  id text primary key, name text not null, public boolean not null default false,
  file_size_limit bigint, allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null references storage.buckets(id),
  name text not null,
  unique (bucket_id, name)
);
create function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1)-1];
$$;
alter table storage.objects enable row level security;
grant usage on schema storage, auth to authenticated;
grant select, insert, update, delete on storage.objects to authenticated;
