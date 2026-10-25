import { createClient } from "@/lib/supabase/server";
import { getTeams } from "@/lib/teams";

export async function getMemberPortalUser() {
  const client = await createClient();
  if (!client) return { status: "setup" as const, email: "", name: "", role: "member", teams: [] };
  const { data: { user } } = await client.auth.getUser();
  if (!user?.email) return null;

  const { data: profile, error } = await client.from("member_portal_users")
    .select("id,email,display_name,role,active")
    .eq("email", user.email.toLowerCase())
    .maybeSingle();
  if (error) return { status: "setup" as const, email: user.email, name: "", role: "member", teams: [] };
  if (!profile) return { status: "pending" as const, email: user.email, name: "", role: "member", teams: [] };
  if (!profile.active) return { status: "inactive" as const, email: profile.email, name: profile.display_name, role: profile.role, teams: [] };

  const [{ data: access }, teams] = await Promise.all([
    client.from("member_team_access").select("team_id").eq("member_id", profile.id),
    getTeams()
  ]);
  const teamIds = new Set((access ?? []).map(row => row.team_id));
  return {
    status: "active" as const,
    email: profile.email,
    name: profile.display_name || profile.email.split("@")[0],
    role: profile.role,
    teams: teams.filter(team => team.id && teamIds.has(team.id))
  };
}
