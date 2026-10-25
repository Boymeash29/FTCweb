-- Save a team's roster ordering atomically and only for its existing assignments.
create or replace function public.save_team_member_roster_order(p_team_id uuid, p_member_ids uuid[])
returns boolean
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  assigned_count integer;
begin
  if not public.is_cms_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  select count(*) into assigned_count
  from public.team_member_teams
  where team_id = p_team_id;

  if coalesce(cardinality(p_member_ids), 0) <> assigned_count
    or (select count(distinct submitted.member_id) from unnest(coalesce(p_member_ids, '{}'::uuid[])) as submitted(member_id)) <> assigned_count
    or exists (
      select 1
      from unnest(coalesce(p_member_ids, '{}'::uuid[])) as submitted(member_id)
      left join public.team_member_teams assigned
        on assigned.team_id = p_team_id and assigned.member_id = submitted.member_id
      where assigned.member_id is null
    ) then
    raise exception 'Roster must contain each assigned member exactly once' using errcode = '22023';
  end if;

  update public.team_member_teams assignment
  set sort_order = requested.ordinality::integer
  from unnest(coalesce(p_member_ids, '{}'::uuid[])) with ordinality as requested(member_id, ordinality)
  where assignment.team_id = p_team_id and assignment.member_id = requested.member_id;

  return true;
end;
$$;

revoke all on function public.save_team_member_roster_order(uuid, uuid[]) from public, anon;
grant execute on function public.save_team_member_roster_order(uuid, uuid[]) to authenticated;
