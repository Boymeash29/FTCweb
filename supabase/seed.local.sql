-- Local development only. This bucket lives in the local Supabase Storage service,
-- not in the hosted production schema migration or a Cloudflare account.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'robotics', 'robotics', false, 104857600,
  array['image/jpeg','image/png','image/webp','image/gif','application/pdf','video/mp4','video/webm','application/zip','application/x-zip-compressed','application/octet-stream','application/step','model/stl','application/sla','model/obj','text/plain','model/3mf','image/vnd.dxf','application/dxf']
)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists local_cms_media_select on storage.objects;
create policy local_cms_media_select on storage.objects for select to authenticated
  using (bucket_id = 'robotics' and public.is_cms_user());

drop policy if exists local_cms_media_insert on storage.objects;
create policy local_cms_media_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'robotics' and public.is_cms_user());

drop policy if exists local_cms_media_update on storage.objects;
create policy local_cms_media_update on storage.objects for update to authenticated
  using (bucket_id = 'robotics' and public.is_cms_user())
  with check (bucket_id = 'robotics' and public.is_cms_user());

drop policy if exists local_cms_media_delete on storage.objects;
create policy local_cms_media_delete on storage.objects for delete to authenticated
  using (bucket_id = 'robotics' and public.is_cms_user());

drop policy if exists local_public_media_select on storage.objects;
create policy local_public_media_select on storage.objects for select to anon
  using (
    bucket_id = 'robotics'
    and exists (
      select 1 from public.media_assets
      where media_assets.object_key = storage.objects.name and media_assets.is_public
    )
  );
