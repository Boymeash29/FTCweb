"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient, getCmsUser } from "@/lib/supabase/server";

const rosterSchema = z.object({
  id: z.union([z.literal(""), z.string().uuid()]),
  display_name: z.string().trim().min(1).max(100),
  approved_role: z.string().trim().max(100),
  photo_asset_id: z.union([z.literal(""), z.string().uuid()]),
  is_mentor: z.enum(["true", "false"]),
  status: z.enum(["draft", "published", "archived"]),
  team_ids: z.array(z.string().uuid()).min(1).max(20),
});

export async function saveRosterMember(formData: FormData) {
  const user = await getCmsUser();
  if (user?.role !== "admin") redirect("/admin/login?error=access");
  const parsed = rosterSchema.safeParse({
    ...Object.fromEntries(formData),
    team_ids: formData.getAll("team_id").map(String),
  });
  if (!parsed.success) redirect("/admin/roster?error=validation");
  const client = await createClient();
  if (!client) redirect("/admin/login?error=setup");
  const { error: assignmentTableError } = await client.from("team_member_teams").select("member_id").limit(0);
  if (assignmentTableError) redirect(`/admin/roster?error=${assignmentTableError.code === "42P01" ? "migration" : "save"}`);

  const { team_ids: teamIds, ...memberValues } = parsed.data;
  if (memberValues.photo_asset_id) {
    const { data: photo, error } = await client.from("media_assets").select("id").eq("id", memberValues.photo_asset_id).eq("is_public", true).like("mime_type", "image/%").maybeSingle();
    if (error || !photo) redirect("/admin/roster?error=photo");
  }
  const { data: saved, error: memberError } = await client.from("team_members").upsert({
    ...(memberValues.id ? { id: memberValues.id } : {}),
    display_name: memberValues.display_name,
    approved_role: memberValues.approved_role || null,
    photo_asset_id: memberValues.photo_asset_id || null,
    is_mentor: memberValues.is_mentor === "true",
    status: memberValues.status,
  }).select("id").single();
  if (memberError || !saved) redirect(`/admin/roster?error=${memberError?.code === "42P01" ? "migration" : "save"}`);

  const { data: oldAssignments, error: readAssignmentsError } = await client.from("team_member_teams").select("team_id").eq("member_id", saved.id);
  if (readAssignmentsError) redirect(`/admin/roster?error=${readAssignmentsError.code === "42P01" ? "migration" : "save"}`);
  const { error: assignmentError } = await client.from("team_member_teams").upsert(
    teamIds.map(teamId => ({ team_id: teamId, member_id: saved.id, role_label: memberValues.approved_role || null })),
    { onConflict: "member_id,team_id" }
  );
  if (assignmentError) redirect(`/admin/roster?error=${assignmentError.code === "42P01" ? "migration" : "save"}`);
  for (const assignment of oldAssignments ?? []) {
    if (!teamIds.includes(assignment.team_id)) {
      const { error } = await client.from("team_member_teams").delete().eq("member_id", saved.id).eq("team_id", assignment.team_id);
      if (error) redirect("/admin/roster?error=save");
    }
  }

  revalidatePath("/roster");
  revalidatePath("/teams");
  revalidatePath("/");
  revalidatePath("/admin/roster");
  redirect("/admin/roster?saved=1");
}

export async function reorderTeamRoster(teamId: string, memberIds: string[]) {
  const user = await getCmsUser();
  if (user?.role !== "admin") return { ok: false, message: "Admin access is required to change roster order." };
  const parsed = z.object({ teamId: z.string().uuid(), memberIds: z.array(z.string().uuid()).max(500) }).safeParse({ teamId, memberIds });
  if (!parsed.success || new Set(parsed.data.memberIds).size !== parsed.data.memberIds.length) {
    return { ok: false, message: "That roster order is invalid. Refresh the page and try again." };
  }
  const client = await createClient();
  if (!client) return { ok: false, message: "The database is not configured." };
  const { error } = await client.rpc("save_team_member_roster_order", {
    p_team_id: parsed.data.teamId,
    p_member_ids: parsed.data.memberIds,
  });
  if (error) return { ok: false, message: error.code === "42883" ? "Apply the roster sort-order migration in Supabase first." : "Could not save this order. Check the roster migration and try again." };
  const { data: team } = await client.from("teams").select("slug").eq("id", parsed.data.teamId).maybeSingle();
  revalidatePath("/roster");
  if (team?.slug) revalidatePath(`/teams/${team.slug}`);
  revalidatePath("/admin/roster");
  return { ok: true, message: "Roster order saved." };
}

export async function deleteTeamRosterMember(memberId: string) {
  const user = await getCmsUser();
  if (user?.role !== "admin") return { ok: false, message: "Admin access is required to delete roster entries." };
  const parsed = z.string().uuid().safeParse(memberId);
  if (!parsed.success) return { ok: false, message: "That roster entry could not be identified." };
  const client = await createClient();
  if (!client) return { ok: false, message: "The database is not configured." };
  const { data: assignments } = await client.from("team_member_teams").select("team_id").eq("member_id", parsed.data);
  const teamIds = [...new Set((assignments ?? []).map(assignment => assignment.team_id))];
  const { data: teams } = teamIds.length ? await client.from("teams").select("slug").in("id", teamIds) : { data: [] };
  const { data, error } = await client.rpc("delete_team_roster_member", { p_member_id: parsed.data });
  if (error) return { ok: false, message: error.code === "42883" ? "Apply the roster delete migration in Supabase first." : "Could not delete this roster entry. Check the roster migrations and try again." };
  if (!data) return { ok: false, message: "This roster entry was already removed." };
  revalidatePath("/roster");
  revalidatePath("/teams");
  for (const team of teams ?? []) revalidatePath(`/teams/${team.slug}`);
  revalidatePath("/admin/roster");
  return { ok: true, message: "Roster entry and its team/season assignments were deleted." };
}
