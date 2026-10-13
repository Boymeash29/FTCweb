alter table public.site_pages
  add column body_format text not null default 'markdown'
  check (body_format in ('markdown', 'html'));
