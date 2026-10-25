"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient, getCmsUser } from "@/lib/supabase/server";

const rosterSchema = z.object({
  id: z.union([z.literal(""), z.string().uuid()]),
  display_name: z.string().trim().min(1).max(100),
  approved_role: z.string().trim().max(100),
  is_mentor: z.enum(["true", "false"]),
  status: z.enum(["draft", "published", "archived"]),
  sort_order: z.coerce.number().int().min(0).max(10000),
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
  const { data: saved, error: memberError } = await client.from("team_members").upsert({
    ...(memberValues.id ? { id: memberValues.id } : {}),
    display_name: memberValues.display_name,
    approved_role: memberValues.approved_role || null,
    is_mentor: memberValues.is_mentor === "true",
    status: memberValues.status,
    sort_order: memberValues.sort_order,
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
