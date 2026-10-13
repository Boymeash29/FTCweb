create table public.season_revisions (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete restrict,
  snapshot jsonb not null,
  author_id uuid references public.cms_users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.season_revisions enable row level security;
create policy season_revisions_admin_read on public.season_revisions
  for select to authenticated using (public.is_cms_admin());
grant select on public.season_revisions to authenticated;

create or replace function public.save_season_revision()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if row(old.name, old.slug, old.year_label, old.start_date, old.end_date, old.summary, old.is_current, old.status)
     is distinct from
     row(new.name, new.slug, new.year_label, new.start_date, new.end_date, new.summary, new.is_current, new.status) then
    insert into public.season_revisions(season_id, snapshot, author_id)
    values (
      old.id,
      jsonb_build_object(
        'name', old.name,
        'slug', old.slug,
        'year_label', old.year_label,
        'start_date', old.start_date,
        'end_date', old.end_date,
        'summary', old.summary,
        'is_current', old.is_current,
        'status', old.status
      ),
      auth.uid()
    );
  end if;
  return new;
end $$;

create trigger seasons_revision_before_update
  before update on public.seasons
  for each row execute function public.save_season_revision();

create or replace function public.save_initial_season_revision()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.season_revisions(season_id, snapshot, author_id)
  values (new.id, jsonb_build_object(
    'name', new.name, 'slug', new.slug, 'year_label', new.year_label,
    'start_date', new.start_date, 'end_date', new.end_date, 'summary', new.summary,
    'is_current', new.is_current, 'status', new.status
  ), auth.uid());
  return new;
end $$;

create trigger seasons_revision_after_insert
  after insert on public.seasons
  for each row execute function public.save_initial_season_revision();

insert into public.season_revisions(season_id, snapshot)
select id, jsonb_build_object(
  'name', name, 'slug', slug, 'year_label', year_label, 'start_date', start_date,
  'end_date', end_date, 'summary', summary, 'is_current', is_current, 'status', status
)
from public.seasons
where not exists (select 1 from public.season_revisions r where r.season_id = seasons.id);

create or replace function public.save_site_page_revision()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if row(old.title, old.eyebrow, old.intro, old.sections, old.links, old.body_markdown, old.body_format, old.status)
     is distinct from
     row(new.title, new.eyebrow, new.intro, new.sections, new.links, new.body_markdown, new.body_format, new.status) then
    insert into public.site_page_revisions(page_key, snapshot, author_id)
    values (
      old.page_key,
      jsonb_build_object(
        'title', old.title,
        'eyebrow', old.eyebrow,
        'intro', old.intro,
        'sections', old.sections,
        'links', old.links,
        'body_markdown', old.body_markdown,
        'body_format', old.body_format,
        'status', old.status
      ),
      new.updated_by
    );
  end if;
  return new;
end $$;

insert into public.site_page_revisions(page_key, snapshot, author_id)
select p.page_key, jsonb_build_object(
  'title', p.title, 'eyebrow', p.eyebrow, 'intro', p.intro,
  'sections', p.sections, 'links', p.links, 'body_markdown', p.body_markdown,
  'body_format', p.body_format, 'status', p.status
), p.updated_by
from public.site_pages p
where not exists (select 1 from public.site_page_revisions r where r.page_key = p.page_key);

create or replace function public.save_mechanism_revision()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if row(old.name, old.purpose, old.requirements, old.design_rationale, old.implementation, old.testing, old.body_markdown, old.status, old.published_at)
     is distinct from
     row(new.name, new.purpose, new.requirements, new.design_rationale, new.implementation, new.testing, new.body_markdown, new.status, new.published_at) then
    insert into public.mechanism_revisions(mechanism_id, snapshot, author_id)
    values (
      old.id,
      jsonb_build_object(
        'name', old.name,
        'purpose', old.purpose,
        'requirements', old.requirements,
        'design_rationale', old.design_rationale,
        'implementation', old.implementation,
        'testing', old.testing,
        'body_markdown', old.body_markdown,
        'status', old.status,
        'published_at', old.published_at
      ),
      new.updated_by
    );
  end if;
  return new;
end $$;

insert into public.mechanism_revisions(mechanism_id, snapshot)
select id, jsonb_build_object(
  'name', name, 'purpose', purpose, 'requirements', requirements,
  'design_rationale', design_rationale, 'implementation', implementation,
  'testing', testing, 'body_markdown', body_markdown, 'status', status,
  'published_at', published_at
)
from public.mechanisms
where not exists (select 1 from public.mechanism_revisions r where r.mechanism_id = mechanisms.id);

create or replace function public.save_content_revision()
returns trigger language plpgsql security definer set search_path = '' as $$
declare next_version integer;
begin
  if row(old.title, old.slug, old.type, old.summary, old.body, old.body_markdown, old.status, old.published_at, old.scheduled_at)
     is distinct from
     row(new.title, new.slug, new.type, new.summary, new.body, new.body_markdown, new.status, new.published_at, new.scheduled_at) then
    select coalesce(max(version), 0) + 1 into next_version from public.content_revisions where entry_id = old.id;
    insert into public.content_revisions(entry_id, version, snapshot, author_id)
    values (old.id, next_version, jsonb_build_object(
      'title', old.title, 'slug', old.slug, 'type', old.type, 'summary', old.summary,
      'body', old.body, 'body_markdown', old.body_markdown, 'status', old.status,
      'published_at', old.published_at, 'scheduled_at', old.scheduled_at
    ), coalesce(new.updated_by, auth.uid()));
  end if;
  return new;
end $$;

insert into public.content_revisions(entry_id, version, snapshot, author_id)
select e.id, 1, jsonb_build_object(
  'title', e.title, 'slug', e.slug, 'type', e.type, 'summary', e.summary,
  'body', e.body, 'body_markdown', e.body_markdown, 'status', e.status,
  'published_at', e.published_at, 'scheduled_at', e.scheduled_at
), e.author_id
from public.content_entries e
where not exists (select 1 from public.content_revisions r where r.entry_id = e.id);

create or replace function public.save_initial_content_revision()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.content_revisions(entry_id, version, snapshot, author_id)
  values (new.id, 1, jsonb_build_object(
    'title', new.title, 'slug', new.slug, 'type', new.type, 'summary', new.summary,
    'body', new.body, 'body_markdown', new.body_markdown, 'status', new.status,
    'published_at', new.published_at, 'scheduled_at', new.scheduled_at
  ), coalesce(new.updated_by, new.author_id, auth.uid()));
  return new;
end $$;

create trigger content_entries_revision_after_insert
  after insert on public.content_entries
  for each row execute function public.save_initial_content_revision();

create or replace function public.save_initial_mechanism_revision()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.mechanism_revisions(mechanism_id, snapshot, author_id)
  values (new.id, jsonb_build_object(
    'name', new.name, 'purpose', new.purpose, 'requirements', new.requirements,
    'design_rationale', new.design_rationale, 'implementation', new.implementation,
    'testing', new.testing, 'body_markdown', new.body_markdown, 'status', new.status,
    'published_at', new.published_at
  ), new.updated_by);
  return new;
end $$;

create trigger mechanisms_revision_after_insert
  after insert on public.mechanisms
  for each row execute function public.save_initial_mechanism_revision();
