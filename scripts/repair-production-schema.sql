-- One-time production recovery for the older public CMS schema.
-- Run only when reconciling that legacy schema; this renames and locks legacy tables
-- before rebuilding the current CMS schema. It preserves legacy rows but is not a
-- repeatable migration.
begin;
-- Preserve older incompatible CMS data under isolated legacy names while restoring the schema expected by this app.
do $$ declare tbl text; begin
  foreach tbl in array array['seasons','robots','mechanisms','content_revisions','media_assets','audit_logs','site_settings'] loop
    if to_regclass('public.' || tbl) is not null then
      execute format('alter table public.%I rename to %I', tbl, 'legacy_' || tbl || '_20261013');
    end if;
  end loop;
end $$;
-- Drop an obsolete public view definition so the migration can recreate it consistently.
do $$ begin
  if exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='published_content_entries' and c.relkind='v') then drop view public.published_content_entries; end if;
end $$;
-- Rename indexes and sequences retained by the preserved legacy tables so the current schema can recreate their names.
do $$ declare r record; new_name text; begin
  for r in select indexname from pg_indexes where schemaname='public' and tablename like 'legacy\_%' escape '\' loop
    new_name := left('legacy_' || r.indexname, 63);
    if to_regclass('public.' || new_name) is null then execute format('alter index public.%I rename to %I', r.indexname, new_name); end if;
  end loop;
  for r in select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace join pg_depend d on d.objid=c.oid and d.deptype in ('a','i') join pg_class t on t.oid=d.refobjid where n.nspname='public' and c.relkind='S' and t.relname like 'legacy\_%' escape '\' loop
    new_name := left('legacy_' || r.relname, 63);
    if to_regclass('public.' || new_name) is null then execute format('alter sequence public.%I rename to %I', r.relname, new_name); end if;
  end loop;
end $$;
-- Lock archived legacy tables away from the website roles without deleting their rows.
do $$ declare r record; begin
  for r in select tablename from pg_tables where schemaname='public' and tablename like 'legacy\_%' escape '\' loop
    execute format('alter table public.%I enable row level security', r.tablename);
    execute format('revoke all on table public.%I from anon, authenticated', r.tablename);
  end loop;
  for r in select policyname from pg_policies where schemaname='public' and tablename='cms_users' loop
    execute format('drop policy if exists %I on public.cms_users', r.policyname);
  end loop;
end $$;
do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid=t.typnamespace where n.nspname='public' and t.typname='cms_role') then create type public.cms_role as enum ('admin','editor'); end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid=t.typnamespace where n.nspname='public' and t.typname='content_status') then create type public.content_status as enum ('draft','scheduled','published','archived'); end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid=t.typnamespace where n.nspname='public' and t.typname='entry_type') then create type public.entry_type as enum ('news','journal','project'); end if;
end $$;
-- Initial, intentionally minimal CMS schema. Run with: supabase db push
create extension if not exists pgcrypto;


create table if not exists public.cms_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role public.cms_role not null default 'editor',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_cms_user()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.cms_users where id = (select auth.uid()) and active)
$$;

create or replace function public.is_cms_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.cms_users where id = (select auth.uid()) and active and role = 'admin')
$$;

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  year_label text,
  start_date date,
  end_date date,
  is_current boolean not null default false,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index seasons_only_one_current on public.seasons (is_current) where is_current;

create table public.robots (
  id uuid primary key default gen_random_uuid(), season_id uuid not null references public.seasons(id) on delete restrict,
  name text not null, slug text not null unique, summary text not null default '', details jsonb not null default '{}'::jsonb,
  status public.content_status not null default 'draft', published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.mechanisms (
  id uuid primary key default gen_random_uuid(), season_id uuid not null references public.seasons(id) on delete restrict,
  name text not null, slug text not null unique, purpose text not null default '', requirements jsonb not null default '[]'::jsonb,
  design_rationale text not null default '', implementation jsonb not null default '{}'::jsonb, testing jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0, status public.content_status not null default 'draft', published_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.engineering_projects (
  id uuid primary key default gen_random_uuid(), season_id uuid not null references public.seasons(id) on delete restrict,
  title text not null, slug text not null unique, summary text not null default '', body jsonb not null default '[]'::jsonb,
  status public.content_status not null default 'draft', published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.software_documents (
  id uuid primary key default gen_random_uuid(), season_id uuid not null references public.seasons(id) on delete restrict,
  title text not null, slug text not null unique, category text not null default 'architecture', summary text not null default '', body jsonb not null default '[]'::jsonb,
  repo_url text, status public.content_status not null default 'draft', published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.team_members (
  id uuid primary key default gen_random_uuid(), display_name text not null, approved_role text, is_mentor boolean not null default false,
  photo_asset_id uuid, sort_order integer not null default 0, status public.content_status not null default 'draft',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.season_memberships (
  season_id uuid not null references public.seasons(id) on delete restrict, member_id uuid not null references public.team_members(id) on delete restrict,
  role_label text, primary key(season_id, member_id)
);

create table public.competition_events (
  id uuid primary key default gen_random_uuid(), season_id uuid not null references public.seasons(id) on delete restrict,
  name text not null, slug text not null unique, event_date date, location text, official_url text,
  status public.content_status not null default 'draft', published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.competition_results (
  id uuid primary key default gen_random_uuid(), event_id uuid not null references public.competition_events(id) on delete restrict,
  result_label text not null, rank integer, verified boolean not null default false, official_url text, created_at timestamptz not null default now()
);

create table public.sponsors (
  id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique, description text, website_url text,
  logo_asset_id uuid, usage_notes text, status public.content_status not null default 'draft', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.season_sponsors (
  season_id uuid not null references public.seasons(id) on delete restrict, sponsor_id uuid not null references public.sponsors(id) on delete restrict,
  level_label text, primary key(season_id, sponsor_id)
);

create table public.outreach_events (
  id uuid primary key default gen_random_uuid(), season_id uuid references public.seasons(id) on delete restrict,
  name text not null, slug text not null unique, event_date date, description text not null default '', audience text, verified_outcomes jsonb not null default '[]'::jsonb,
  status public.content_status not null default 'draft', published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.content_entries (
  id uuid primary key default gen_random_uuid(), type public.entry_type not null, season_id uuid references public.seasons(id) on delete restrict,
  title text not null, slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'), summary text not null default '',
  body jsonb not null default '[]'::jsonb, status public.content_status not null default 'draft', published_at timestamptz,
  scheduled_at timestamptz, author_id uuid not null references public.cms_users(id) on delete restrict,
  updated_by uuid references public.cms_users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check ((status = 'published' and published_at is not null) or status <> 'published'),
  check ((status = 'scheduled' and scheduled_at is not null) or status <> 'scheduled')
);
create index content_entries_public_search on public.content_entries using gin (to_tsvector('english', title || ' ' || summary)) where status = 'published';
create index content_entries_season on public.content_entries (season_id, status);
create index content_entries_schedule on public.content_entries (scheduled_at) where status = 'scheduled';

create table public.media_assets (
  id uuid primary key default gen_random_uuid(), season_id uuid references public.seasons(id) on delete restrict,
  title text not null, object_key text not null unique, mime_type text not null, byte_size bigint not null check(byte_size >= 0),
  width integer, height integer, caption text, alt_text text, creator_credit text, is_public boolean not null default false,
  created_by uuid references public.cms_users(id) on delete set null, created_at timestamptz not null default now()
);
alter table public.team_members add constraint team_members_photo_fk foreign key(photo_asset_id) references public.media_assets(id) on delete set null;
alter table public.sponsors add constraint sponsors_logo_fk foreign key(logo_asset_id) references public.media_assets(id) on delete set null;
create table public.content_media (
  asset_id uuid not null references public.media_assets(id) on delete restrict, content_type text not null,
  content_id uuid not null, usage_label text not null default '', sort_order integer not null default 0, primary key(asset_id, content_type, content_id)
);

create table public.content_revisions (
  id uuid primary key default gen_random_uuid(), entry_id uuid not null references public.content_entries(id) on delete restrict,
  version integer not null, snapshot jsonb not null, author_id uuid references public.cms_users(id) on delete set null,
  created_at timestamptz not null default now(), unique(entry_id, version)
);
create table public.audit_logs (
  id bigint generated always as identity primary key, actor_id uuid references public.cms_users(id) on delete set null,
  action text not null, entity_type text not null, entity_id uuid, details jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table public.site_settings (
  key text primary key, value jsonb not null default '{}'::jsonb, updated_by uuid references public.cms_users(id) on delete set null, updated_at timestamptz not null default now()
);

create or replace function public.save_content_revision()
returns trigger language plpgsql security definer set search_path = '' as $$
declare next_version integer;
begin
  select coalesce(max(version), 0) + 1 into next_version from public.content_revisions where entry_id = old.id;
  insert into public.content_revisions(entry_id, version, snapshot, author_id)
  values (old.id, next_version, jsonb_build_object(
    'title', old.title, 'slug', old.slug, 'type', old.type, 'summary', old.summary, 'body', old.body,
    'status', old.status, 'published_at', old.published_at, 'scheduled_at', old.scheduled_at
  ), (select auth.uid()));
  return new;
end $$;

create trigger content_entries_revision_before_update
  before update on public.content_entries for each row execute function public.save_content_revision();

create or replace function public.audit_content_entry()
returns trigger language plpgsql security definer set search_path = '' as $$
declare current_row public.content_entries%rowtype;
begin
  if tg_op = 'DELETE' then current_row := old; else current_row := new; end if;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, details)
  values ((select auth.uid()),
    lower(tg_op), 'content_entry', current_row.id,
    jsonb_build_object('title', current_row.title, 'slug', current_row.slug, 'status', current_row.status));
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

create trigger content_entries_audit_after_change
  after insert or update or delete on public.content_entries for each row execute function public.audit_content_entry();

-- All tables are private by default. Public views expose published records only.
do $$ declare t text; begin
  foreach t in array array['cms_users','seasons','robots','mechanisms','engineering_projects','software_documents','team_members','season_memberships','competition_events','competition_results','sponsors','season_sponsors','outreach_events','content_entries','media_assets','content_media','content_revisions','audit_logs','site_settings'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.is_cms_user())', t || '_cms_read', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.is_cms_user())', t || '_cms_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.is_cms_user()) with check (public.is_cms_user())', t || '_cms_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.is_cms_user())', t || '_cms_delete', t);
  end loop;
end $$;
-- Role assignment and allowlist maintenance are admin-only. Users cannot update cms_users through the client.
drop policy cms_users_cms_insert on public.cms_users;
drop policy cms_users_cms_update on public.cms_users;
drop policy cms_users_cms_delete on public.cms_users;
drop policy cms_users_cms_read on public.cms_users;
create policy cms_users_self_select on public.cms_users for select to authenticated using (id = (select auth.uid()) and active);
create policy cms_users_admin_manage on public.cms_users for all to authenticated using (public.is_cms_admin()) with check (public.is_cms_admin());

-- Editors may author and update their own drafts only. Publication/scheduling is admin-only at RLS as well as in the server action.
drop policy content_entries_cms_insert on public.content_entries;
drop policy content_entries_cms_update on public.content_entries;
drop policy content_entries_cms_delete on public.content_entries;
create policy content_entries_insert_rules on public.content_entries for insert to authenticated
  with check (public.is_cms_admin() or (public.is_cms_user() and status = 'draft' and author_id = (select auth.uid()) and updated_by = (select auth.uid())));
create policy content_entries_update_rules on public.content_entries for update to authenticated
  using (public.is_cms_admin() or (public.is_cms_user() and status = 'draft' and author_id = (select auth.uid())))
  with check (public.is_cms_admin() or (public.is_cms_user() and status = 'draft' and author_id = (select auth.uid()) and updated_by = (select auth.uid())));

create or replace view public.published_content_entries with (security_invoker = true) as
  select id, type, season_id, title, slug, summary, body, published_at, created_at, updated_at
  from public.content_entries where status = 'published' and published_at <= now();
create policy content_entries_published_public_read on public.content_entries for select to anon, authenticated
  using (status = 'published' and published_at is not null and published_at <= now());
grant select on public.content_entries to anon, authenticated;
grant select on public.published_content_entries to anon, authenticated;
create policy media_assets_public_read on public.media_assets for select to anon, authenticated using (is_public);
grant select on public.media_assets to anon, authenticated;
create policy mechanisms_published_public_read on public.mechanisms for select to anon, authenticated
  using (status = 'published' and published_at is not null and published_at <= now());
grant select on public.mechanisms to anon, authenticated;
grant execute on function public.is_cms_user() to authenticated;
grant execute on function public.is_cms_admin() to authenticated;

-- BioBuzz is the only season fact supplied for initial setup; leave dates unknown.
insert into public.seasons(name, slug, year_label, is_current, status)
values ('BioBuzz', 'biobuzz', null, true, 'published')
on conflict (slug) do update set name = excluded.name, is_current = true, status = 'published';

-- Security-sensitive admin data is visible/writable only to admins.
drop policy audit_logs_cms_insert on public.audit_logs;
drop policy audit_logs_cms_update on public.audit_logs;
drop policy audit_logs_cms_delete on public.audit_logs;
drop policy audit_logs_cms_read on public.audit_logs;
create policy audit_logs_admin_manage on public.audit_logs for all to authenticated using (public.is_cms_admin()) with check (public.is_cms_admin());
drop policy site_settings_cms_insert on public.site_settings;
drop policy site_settings_cms_update on public.site_settings;
drop policy site_settings_cms_delete on public.site_settings;
drop policy site_settings_cms_read on public.site_settings;
create policy site_settings_admin_manage on public.site_settings for all to authenticated using (public.is_cms_admin()) with check (public.is_cms_admin());

drop policy content_revisions_cms_read on public.content_revisions;
drop policy content_revisions_cms_insert on public.content_revisions;
drop policy content_revisions_cms_update on public.content_revisions;
drop policy content_revisions_cms_delete on public.content_revisions;
create policy content_revisions_admin_read on public.content_revisions for select to authenticated using (public.is_cms_admin());

-- Uploaders can create and edit their own private assets; only admins may publish or remove media.
drop policy media_assets_cms_insert on public.media_assets;
drop policy media_assets_cms_update on public.media_assets;
drop policy media_assets_cms_delete on public.media_assets;
create policy media_assets_insert_rules on public.media_assets for insert to authenticated
  with check (public.is_cms_admin() or (public.is_cms_user() and not is_public and created_by = (select auth.uid())));
create policy media_assets_update_rules on public.media_assets for update to authenticated
  using (public.is_cms_admin() or (public.is_cms_user() and not is_public and created_by = (select auth.uid())))
  with check (public.is_cms_admin() or (public.is_cms_user() and not is_public and created_by = (select auth.uid())));
create policy media_assets_admin_delete on public.media_assets for delete to authenticated using (public.is_cms_admin());

-- First admin provisioning is a manual, owner-controlled SQL step. See README.

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

alter table public.site_pages add column body_markdown text check (body_markdown is null or char_length(body_markdown) <= 100000);

create or replace function public.save_site_page_revision()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.site_page_revisions(page_key, snapshot, author_id)
  values (old.page_key, jsonb_build_object('title',old.title,'eyebrow',old.eyebrow,'intro',old.intro,'sections',old.sections,'links',old.links,'body_markdown',old.body_markdown,'status',old.status), new.updated_by);
  return new;
end $$;

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

commit;
