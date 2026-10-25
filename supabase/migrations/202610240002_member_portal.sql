-- A separate, allowlisted member hub with team-scoped private notices, events, and resources.
create table if not exists public.member_portal_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(trim(email))),
  display_name text not null default '',
  role text not null default 'member' check (role in ('member', 'mentor')),
  active boolean not null default true,
  created_by uuid references public.cms_users(id) on delete set null,
  updated_by uuid references public.cms_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.member_team_access (
  member_id uuid not null references public.member_portal_users(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (member_id, team_id)
);

create table if not exists public.member_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 160),
  body_markdown text not null default '',
  team_id uuid references public.teams(id) on delete cascade,
  pinned boolean not null default false,
  active boolean not null default true,
  created_by uuid references public.cms_users(id) on delete set null,
  updated_by uuid references public.cms_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.member_events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 160),
  start_at timestamptz not null,
  end_at timestamptz,
  location text not null default '',
  details text not null default '',
  team_id uuid references public.teams(id) on delete cascade,
  active boolean not null default true,
  created_by uuid references public.cms_users(id) on delete set null,
  updated_by uuid references public.cms_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at is null or end_at >= start_at)
);

create table if not exists public.member_resources (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 160),
  description text not null default '',
  category text not null default 'General',
  url text,
  asset_id uuid references public.media_assets(id) on delete set null,
  team_id uuid references public.teams(id) on delete cascade,
  active boolean not null default true,
  created_by uuid references public.cms_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((nullif(trim(url), '') is not null) <> (asset_id is not null))
);

create index if not exists member_events_upcoming on public.member_events(start_at) where active;
create index if not exists member_announcements_latest on public.member_announcements(pinned desc, created_at desc) where active;
create index if not exists member_resources_team on public.member_resources(team_id, category, title) where active;

create or replace function public.is_member_portal_user()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.member_portal_users m
    where m.active and m.email = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  )
$$;

create or replace function public.is_member_of_team(target_team_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.member_portal_users m
    join public.member_team_access a on a.member_id = m.id
    where m.active
      and m.email = lower(coalesce((select auth.jwt() ->> 'email'), ''))
      and a.team_id = target_team_id
  )
$$;

create or replace function public.can_view_member_team(target_team_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_cms_admin() or (
    public.is_member_portal_user() and (target_team_id is null or public.is_member_of_team(target_team_id))
  )
$$;

alter table public.member_portal_users enable row level security;
alter table public.member_team_access enable row level security;
alter table public.member_announcements enable row level security;
alter table public.member_events enable row level security;
alter table public.member_resources enable row level security;

drop policy if exists member_portal_users_self_read on public.member_portal_users;
create policy member_portal_users_self_read on public.member_portal_users for select to authenticated
  using (email = lower(coalesce((select auth.jwt() ->> 'email'), '')) or public.is_cms_admin());
drop policy if exists member_portal_users_admin_manage on public.member_portal_users;
create policy member_portal_users_admin_manage on public.member_portal_users for all to authenticated
  using (public.is_cms_admin()) with check (public.is_cms_admin());

drop policy if exists member_team_access_self_read on public.member_team_access;
create policy member_team_access_self_read on public.member_team_access for select to authenticated
  using (exists (
    select 1 from public.member_portal_users m
    where m.id = member_id and m.email = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  ) or public.is_cms_admin());
drop policy if exists member_team_access_admin_manage on public.member_team_access;
create policy member_team_access_admin_manage on public.member_team_access for all to authenticated
  using (public.is_cms_admin()) with check (public.is_cms_admin());

drop policy if exists member_announcements_read on public.member_announcements;
create policy member_announcements_read on public.member_announcements for select to authenticated
  using (active and public.can_view_member_team(team_id));
drop policy if exists member_announcements_admin_manage on public.member_announcements;
create policy member_announcements_admin_manage on public.member_announcements for all to authenticated
  using (public.is_cms_admin()) with check (public.is_cms_admin());

drop policy if exists member_events_read on public.member_events;
create policy member_events_read on public.member_events for select to authenticated
  using (active and public.can_view_member_team(team_id));
drop policy if exists member_events_admin_manage on public.member_events;
create policy member_events_admin_manage on public.member_events for all to authenticated
  using (public.is_cms_admin()) with check (public.is_cms_admin());

drop policy if exists member_resources_read on public.member_resources;
create policy member_resources_read on public.member_resources for select to authenticated
  using (active and public.can_view_member_team(team_id));
drop policy if exists member_resources_admin_manage on public.member_resources;
create policy member_resources_admin_manage on public.member_resources for all to authenticated
  using (public.is_cms_admin()) with check (public.is_cms_admin());

drop policy if exists media_assets_member_resource_read on public.media_assets;
create policy media_assets_member_resource_read on public.media_assets for select to authenticated
  using (exists (
    select 1 from public.member_resources r
    where r.asset_id = public.media_assets.id and r.active and public.can_view_member_team(r.team_id)
  ));

grant select, insert, update, delete on public.member_portal_users, public.member_team_access,
  public.member_announcements, public.member_events, public.member_resources to authenticated;

create or replace function public.save_member_portal_access(
  p_email text, p_display_name text, p_role text, p_active boolean, p_team_slugs text[]
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  normalized_email text := lower(trim(p_email));
  saved_id uuid;
begin
  if not public.is_cms_admin() then raise exception 'Not authorized' using errcode = '42501'; end if;
  if normalized_email = '' or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or char_length(trim(p_display_name)) > 120 or p_role not in ('member', 'mentor')
     or p_active is null or p_team_slugs is null then
    raise exception 'Invalid member access details' using errcode = '22023';
  end if;
  if exists (
    select 1 from unnest(p_team_slugs) requested(slug)
    where not exists (select 1 from public.teams t where t.slug = requested.slug and t.status = 'published')
  ) then raise exception 'Unknown team' using errcode = '22023'; end if;

  insert into public.member_portal_users(email, display_name, role, active, created_by)
  values (normalized_email, trim(p_display_name), p_role, p_active, auth.uid())
  on conflict (email) do update set display_name = excluded.display_name, role = excluded.role,
    active = excluded.active, updated_at = now()
  returning id into saved_id;

  delete from public.member_team_access where member_id = saved_id;
  insert into public.member_team_access(member_id, team_id)
  select saved_id, t.id from public.teams t where t.slug = any(p_team_slugs);

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'member_portal_access_saved', 'member_portal_user', saved_id,
    jsonb_build_object('email', normalized_email, 'role', p_role, 'active', p_active, 'teams', p_team_slugs));
  return saved_id;
end
$$;

revoke all on function public.save_member_portal_access(text, text, text, boolean, text[]) from public, anon;
grant execute on function public.save_member_portal_access(text, text, text, boolean, text[]) to authenticated;
grant execute on function public.is_member_portal_user(), public.is_member_of_team(uuid), public.can_view_member_team(uuid) to authenticated;

notify pgrst, 'reload schema';
