create table public.site_pages (
  page_key text primary key check (page_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 140),
  eyebrow text not null default '' check (char_length(eyebrow) <= 120),
  intro text not null default '' check (char_length(intro) <= 2000),
  sections jsonb not null default '[]'::jsonb check (jsonb_typeof(sections) = 'array'),
  links jsonb not null default '[]'::jsonb check (jsonb_typeof(links) = 'array'),
  status text not null default 'published' check (status in ('draft','published')),
  updated_by uuid references public.cms_users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.site_pages enable row level security;
create policy site_pages_cms_read on public.site_pages for select to authenticated using (public.is_cms_user());
create policy site_pages_admin_insert on public.site_pages for insert to authenticated with check (public.is_cms_admin() and updated_by = (select auth.uid()));
create policy site_pages_admin_update on public.site_pages for update to authenticated using (public.is_cms_admin()) with check (public.is_cms_admin() and updated_by = (select auth.uid()));
create policy site_pages_published_public_read on public.site_pages for select to anon, authenticated using (status = 'published');
grant select on public.site_pages to anon, authenticated;
grant insert, update on public.site_pages to authenticated;

create table public.site_page_revisions (
  id uuid primary key default gen_random_uuid(),
  page_key text not null references public.site_pages(page_key) on delete restrict,
  snapshot jsonb not null,
  author_id uuid references public.cms_users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.site_page_revisions enable row level security;
create policy site_page_revisions_admin_read on public.site_page_revisions for select to authenticated using (public.is_cms_admin());
create policy site_page_revisions_admin_insert on public.site_page_revisions for insert to authenticated with check (public.is_cms_admin() and author_id = (select auth.uid()));
grant select, insert on public.site_page_revisions to authenticated;

create or replace function public.save_site_page_revision()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.site_page_revisions(page_key, snapshot, author_id)
  values (old.page_key, jsonb_build_object('title',old.title,'eyebrow',old.eyebrow,'intro',old.intro,'sections',old.sections,'links',old.links,'status',old.status), new.updated_by);
  return new;
end $$;
create trigger site_pages_revision_before_update before update on public.site_pages
  for each row execute function public.save_site_page_revision();
