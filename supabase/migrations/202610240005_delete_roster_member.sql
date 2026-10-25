-- Delete a roster profile and its team and season roster associations atomically.
create or replace function public.delete_team_roster_member(p_member_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if not public.is_cms_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  delete from public.season_memberships where member_id = p_member_id;
  delete from public.team_member_teams where member_id = p_member_id;
  delete from public.team_members where id = p_member_id;
  return found;
end;
$$;

revoke all on function public.delete_team_roster_member(uuid) from public, anon;
grant execute on function public.delete_team_roster_member(uuid) to authenticated;
