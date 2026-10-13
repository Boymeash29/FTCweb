alter table public.content_entries add column body_markdown text check (body_markdown is null or char_length(body_markdown) <= 100000);
alter table public.mechanisms add column body_markdown text check (body_markdown is null or char_length(body_markdown) <= 100000);
alter table public.mechanisms add column updated_by uuid references public.cms_users(id) on delete set null;

create or replace view public.published_content_entries with (security_invoker = true) as
  select id, type, season_id, title, slug, summary, body, published_at, created_at, updated_at, body_markdown
  from public.content_entries where status = 'published' and published_at <= now();

create table public.mechanism_revisions (
  id uuid primary key default gen_random_uuid(),
  mechanism_id uuid not null references public.mechanisms(id) on delete restrict,
  snapshot jsonb not null,
  author_id uuid references public.cms_users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.mechanism_revisions enable row level security;
create policy mechanism_revisions_admin_read on public.mechanism_revisions for select to authenticated using (public.is_cms_admin());
create policy mechanism_revisions_admin_insert on public.mechanism_revisions for insert to authenticated with check (public.is_cms_admin() and author_id = (select auth.uid()));
grant select, insert on public.mechanism_revisions to authenticated;

create or replace function public.save_content_revision()
returns trigger language plpgsql security definer set search_path = '' as $$
declare next_version integer;
begin
  select coalesce(max(version), 0) + 1 into next_version from public.content_revisions where entry_id = old.id;
  insert into public.content_revisions(entry_id, version, snapshot, author_id)
  values (old.id, next_version, jsonb_build_object(
    'title', old.title, 'slug', old.slug, 'type', old.type, 'summary', old.summary, 'body', old.body, 'body_markdown', old.body_markdown,
    'status', old.status, 'published_at', old.published_at, 'scheduled_at', old.scheduled_at
  ), (select auth.uid()));
  return new;
end $$;

create or replace function public.save_mechanism_revision()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.mechanism_revisions(mechanism_id,snapshot,author_id)
  values (old.id,jsonb_build_object('name',old.name,'purpose',old.purpose,'requirements',old.requirements,'design_rationale',old.design_rationale,'implementation',old.implementation,'testing',old.testing,'body_markdown',old.body_markdown,'status',old.status,'published_at',old.published_at),new.updated_by);
  return new;
end $$;
create trigger mechanisms_revision_before_update before update on public.mechanisms
  for each row execute function public.save_mechanism_revision();
