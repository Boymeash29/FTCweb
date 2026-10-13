alter table public.site_pages add column body_markdown text check (body_markdown is null or char_length(body_markdown) <= 100000);

create or replace function public.save_site_page_revision()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.site_page_revisions(page_key, snapshot, author_id)
  values (old.page_key, jsonb_build_object('title',old.title,'eyebrow',old.eyebrow,'intro',old.intro,'sections',old.sections,'links',old.links,'body_markdown',old.body_markdown,'status',old.status), new.updated_by);
  return new;
end $$;
