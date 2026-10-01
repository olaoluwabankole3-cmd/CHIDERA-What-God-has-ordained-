-- Incremental migration for the PDF RAG upload path.
-- Safe to run after the original Academic AI schema.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'course-materials',
  'course-materials',
  false,
  20971520,
  array['application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "course_materials_select_own" on storage.objects;
create policy "course_materials_select_own"
on storage.objects for select
to authenticated
using (
  bucket_id = 'course-materials'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "course_materials_insert_own" on storage.objects;
create policy "course_materials_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'course-materials'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "course_materials_delete_own" on storage.objects;
create policy "course_materials_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'course-materials'
  and (storage.foldername(name))[1] = auth.uid()::text
);
