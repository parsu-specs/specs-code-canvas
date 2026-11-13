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
