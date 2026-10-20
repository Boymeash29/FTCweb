-- Make team identity and ownership first-class in the public site and CMS.
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  number text not null unique check (number ~ '^[0-9]+$'),
  summary text not null default '',
  status public.content_status not null default 'published',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.teams(slug, name, number, summary, status, sort_order)
values
  ('buzzerbots', 'BuzzerBots', '23826', 'Seven Hills FTC Team 23826.', 'published', 10),
  ('hive-mind', 'Hive Mind', '36438', 'Seven Hills FTC Team 36438.', 'published', 20)
on conflict (slug) do update set name = excluded.name, number = excluded.number, updated_at = now();

alter table public.teams enable row level security;
create policy teams_cms_read on public.teams for select to authenticated using (public.is_cms_user());
create policy teams_admin_manage on public.teams for all to authenticated using (public.is_cms_admin()) with check (public.is_cms_admin());
create policy teams_public_read on public.teams for select to anon, authenticated using (status = 'published');
grant select on public.teams to anon, authenticated;
grant insert, update, delete on public.teams to authenticated;

alter table public.seasons add column if not exists team_id uuid references public.teams(id) on delete restrict;
alter table public.content_entries add column if not exists team_id uuid references public.teams(id) on delete restrict;

update public.seasons set team_id = (select id from public.teams where slug = 'buzzerbots') where slug = 'biobuzz' and team_id is null;
update public.content_entries e set team_id = s.team_id from public.seasons s where e.season_id = s.id and e.team_id is null and s.team_id is not null;

 drop index if exists public.seasons_only_one_current;
create unique index if not exists seasons_one_current_per_team on public.seasons(team_id) where is_current and team_id is not null;
create index if not exists seasons_team_status on public.seasons(team_id, status, start_date desc);
create index if not exists content_entries_team_status on public.content_entries(team_id, status, published_at desc);

create or replace function public.save_season_revision()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if row(old.name, old.slug, old.year_label, old.start_date, old.end_date, old.summary, old.is_current, old.status, old.team_id)
     is distinct from
     row(new.name, new.slug, new.year_label, new.start_date, new.end_date, new.summary, new.is_current, new.status, new.team_id) then
    insert into public.season_revisions(season_id, snapshot, author_id)
    values (old.id, jsonb_build_object(
      'name', old.name, 'slug', old.slug, 'year_label', old.year_label,
      'start_date', old.start_date, 'end_date', old.end_date, 'summary', old.summary,
      'is_current', old.is_current, 'status', old.status, 'team_id', old.team_id
    ), auth.uid());
  end if;
  return new;
end $$;

-- Replace the CMS RPC with a team-aware version while keeping all validation and revision behavior.
drop function if exists public.save_cms_season(uuid, text, text, text, date, date, text, boolean, public.content_status);
create function public.save_cms_season(
  p_id uuid, p_name text, p_slug text, p_year_label text, p_start_date date,
  p_end_date date, p_summary text, p_is_current boolean,
  p_status public.content_status, p_team_id uuid
) returns uuid language plpgsql security definer set search_path = '' as $$
declare saved_id uuid;
begin
  if not public.is_cms_admin() then raise exception 'Not authorized' using errcode = '42501'; end if;
  if char_length(trim(p_name)) not between 1 and 120 or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'Invalid season name or slug' using errcode = '22023';
  end if;
  if p_start_date is not null and p_end_date is not null and p_end_date < p_start_date then
    raise exception 'End date must be on or after start date' using errcode = '22023';
  end if;
  if p_team_id is not null and not exists (select 1 from public.teams where id = p_team_id) then
    raise exception 'Team not found' using errcode = '23503';
  end if;
  if p_is_current and p_team_id is null then
    raise exception 'A current season must belong to a team' using errcode = '22023';
  end if;
  if p_is_current and p_team_id is not null then
    update public.seasons set is_current = false, updated_at = now()
      where team_id = p_team_id and is_current and (p_id is null or id <> p_id);
  end if;
  if p_id is null then
    insert into public.seasons(name, slug, year_label, start_date, end_date, summary, is_current, status, team_id, updated_at)
    values (trim(p_name), p_slug, nullif(trim(p_year_label), ''), p_start_date, p_end_date, trim(p_summary), p_is_current, p_status, p_team_id, now())
    returning id into saved_id;
  else
    update public.seasons set name = trim(p_name), slug = p_slug, year_label = nullif(trim(p_year_label), ''),
      start_date = p_start_date, end_date = p_end_date, summary = trim(p_summary),
      is_current = p_is_current, status = p_status, team_id = p_team_id, updated_at = now()
      where id = p_id returning id into saved_id;
    if saved_id is null then raise exception 'Season not found' using errcode = 'P0002'; end if;
  end if;
  return saved_id;
end $$;
revoke all on function public.save_cms_season(uuid, text, text, text, date, date, text, boolean, public.content_status, uuid) from public, anon;
grant execute on function public.save_cms_season(uuid, text, text, text, date, date, text, boolean, public.content_status, uuid) to authenticated;
-- Expose team ownership through the already-public, published-only content view.
create or replace view public.published_content_entries with (security_invoker = true) as
  select id, type, season_id, title, slug, summary, body, published_at, created_at, updated_at, team_id
  from public.content_entries where status = 'published' and published_at <= now();

grant select on public.published_content_entries to anon, authenticated;

create or replace function public.save_content_revision()
returns trigger language plpgsql security definer set search_path = '' as $$
declare next_version integer;
begin
  if row(old.title, old.slug, old.type, old.summary, old.body, old.body_markdown, old.status, old.published_at, old.scheduled_at, old.team_id, old.season_id)
     is distinct from
     row(new.title, new.slug, new.type, new.summary, new.body, new.body_markdown, new.status, new.published_at, new.scheduled_at, new.team_id, new.season_id) then
    select coalesce(max(version), 0) + 1 into next_version from public.content_revisions where entry_id = old.id;
    insert into public.content_revisions(entry_id, version, snapshot, author_id)
    values (old.id, next_version, jsonb_build_object(
      'title', old.title, 'slug', old.slug, 'type', old.type, 'summary', old.summary,
      'body', old.body, 'body_markdown', old.body_markdown, 'status', old.status,
      'published_at', old.published_at, 'scheduled_at', old.scheduled_at, 'team_id', old.team_id, 'season_id', old.season_id
    ), coalesce(new.updated_by, auth.uid()));
  end if;
  return new;
end $$;

create or replace function public.save_initial_content_revision()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.content_revisions(entry_id, version, snapshot, author_id)
  values (new.id, 1, jsonb_build_object(
    'title', new.title, 'slug', new.slug, 'type', new.type, 'summary', new.summary,
    'body', new.body, 'body_markdown', new.body_markdown, 'status', new.status,
    'published_at', new.published_at, 'scheduled_at', new.scheduled_at, 'team_id', new.team_id, 'season_id', new.season_id
  ), coalesce(new.updated_by, new.author_id, auth.uid()));
  return new;
end $$;
-- Public access is limited to records explicitly marked for publication.
create policy robots_published_public_read on public.robots for select to anon, authenticated
  using (status = 'published' and published_at is not null and published_at <= now());
grant select on public.robots to anon, authenticated;

create policy engineering_projects_published_public_read on public.engineering_projects for select to anon, authenticated
  using (status = 'published' and published_at is not null and published_at <= now());
grant select on public.engineering_projects to anon, authenticated;

create policy software_documents_published_public_read on public.software_documents for select to anon, authenticated
  using (status = 'published' and published_at is not null and published_at <= now());
grant select on public.software_documents to anon, authenticated;

create policy competition_events_published_public_read on public.competition_events for select to anon, authenticated
  using (status = 'published' and published_at is not null and published_at <= now());
grant select on public.competition_events to anon, authenticated;

create policy competition_results_verified_public_read on public.competition_results for select to anon, authenticated
  using (verified and exists (select 1 from public.competition_events e where e.id = event_id and e.status = 'published' and e.published_at is not null and e.published_at <= now()));
grant select on public.competition_results to anon, authenticated;

create policy outreach_events_published_public_read on public.outreach_events for select to anon, authenticated
  using (status = 'published' and published_at is not null and published_at <= now());
grant select on public.outreach_events to anon, authenticated;

create policy team_members_published_public_read on public.team_members for select to anon, authenticated
  using (status = 'published');
grant select on public.team_members to anon, authenticated;

create policy season_memberships_published_public_read on public.season_memberships for select to anon, authenticated
  using (exists (select 1 from public.seasons s where s.id = season_id and s.status = 'published')
    and exists (select 1 from public.team_members m where m.id = member_id and m.status = 'published'));
grant select on public.season_memberships to anon, authenticated;

create policy sponsors_published_public_read on public.sponsors for select to anon, authenticated
  using (status = 'published');
grant select on public.sponsors to anon, authenticated;

create policy season_sponsors_published_public_read on public.season_sponsors for select to anon, authenticated
  using (exists (select 1 from public.seasons s where s.id = season_id and s.status = 'published')
    and exists (select 1 from public.sponsors sp where sp.id = sponsor_id and sp.status = 'published'));
grant select on public.season_sponsors to anon, authenticated;

-- Include team membership in season history and record it for new season snapshots.
create or replace function public.save_initial_season_revision()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.season_revisions(season_id, snapshot, author_id)
  values (new.id, jsonb_build_object(
    'name', new.name, 'slug', new.slug, 'year_label', new.year_label,
    'start_date', new.start_date, 'end_date', new.end_date, 'summary', new.summary,
    'is_current', new.is_current, 'status', new.status, 'team_id', new.team_id
  ), auth.uid());
  return new;
end $$;

-- Current seasons must belong to a team; shared seasons remain archive-only.
create table public.team_revisions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete restrict,
  snapshot jsonb not null,
  author_id uuid references public.cms_users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.team_revisions enable row level security;
create policy team_revisions_admin_read on public.team_revisions for select to authenticated using (public.is_cms_admin());
grant select on public.team_revisions to authenticated;

create or replace function public.save_team_revision()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if row(old.slug, old.name, old.number, old.summary, old.status, old.sort_order)
     is distinct from row(new.slug, new.name, new.number, new.summary, new.status, new.sort_order) then
    insert into public.team_revisions(team_id, snapshot, author_id)
    values (old.id, jsonb_build_object(
      'slug', old.slug, 'name', old.name, 'number', old.number,
      'summary', old.summary, 'status', old.status, 'sort_order', old.sort_order
    ), auth.uid());
  end if;
  return new;
end $$;
create trigger teams_revision_before_update before update on public.teams
  for each row execute function public.save_team_revision();

create or replace function public.save_initial_team_revision()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.team_revisions(team_id, snapshot, author_id)
  values (new.id, jsonb_build_object(
    'slug', new.slug, 'name', new.name, 'number', new.number,
    'summary', new.summary, 'status', new.status, 'sort_order', new.sort_order
  ), auth.uid());
  return new;
end $$;
create trigger teams_revision_after_insert after insert on public.teams
  for each row execute function public.save_initial_team_revision();

insert into public.team_revisions(team_id, snapshot)
select t.id, jsonb_build_object('slug',t.slug,'name',t.name,'number',t.number,'summary',t.summary,'status',t.status,'sort_order',t.sort_order)
from public.teams t where not exists (select 1 from public.team_revisions r where r.team_id = t.id);
