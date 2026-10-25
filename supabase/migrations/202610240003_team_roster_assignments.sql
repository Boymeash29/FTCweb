-- Give published people explicit team assignments, independent of shared seasons.
-- Existing assignments from team-specific seasons are copied forward.
create table if not exists public.team_member_teams (
  member_id uuid not null references public.team_members(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  role_label text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (member_id, team_id)
);

create index if not exists team_member_teams_by_team on public.team_member_teams(team_id, sort_order, member_id);
alter table public.team_member_teams enable row level security;

drop policy if exists team_member_teams_public_read on public.team_member_teams;
create policy team_member_teams_public_read on public.team_member_teams for select to anon, authenticated
  using (
    exists (select 1 from public.team_members m where m.id = member_id and m.status = 'published')
    and exists (select 1 from public.teams t where t.id = team_id and t.status = 'published')
  );
drop policy if exists team_member_teams_admin_manage on public.team_member_teams;
create policy team_member_teams_admin_manage on public.team_member_teams for all to authenticated
  using (public.is_cms_admin()) with check (public.is_cms_admin());
grant select on public.team_member_teams to anon, authenticated;

insert into public.team_member_teams(member_id, team_id, role_label, sort_order)
select distinct sm.member_id, s.team_id, coalesce(sm.role_label, m.approved_role), m.sort_order
from public.season_memberships sm
join public.seasons s on s.id = sm.season_id
join public.team_members m on m.id = sm.member_id
where s.team_id is not null
on conflict (member_id, team_id) do nothing;
