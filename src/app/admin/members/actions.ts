"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient, getCmsUser } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";

const optionalId = z.union([z.literal(""), z.string().uuid()]).default("");
const optionalTeamId = optionalId;

async function requireAdmin() {
  const user = await getCmsUser();
  if (user?.role !== "admin") redirect("/admin/login?error=access");
  const client = await createClient();
  if (!client) redirect("/admin/login?error=setup");
  return { user, client };
}

async function inviteMemberIfNeeded(email: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) return "manual";
  const admin = createSupabaseClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
  for (let page = 1; page <= 5; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) break;
    if (data.users.some(user => user.email?.toLowerCase() === email)) return "existing";
    if (data.users.length < 200) break;
  }
  const callback = new URL("/auth/callback?next=%2Fmembers", getSiteUrl());
  const { error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: callback.toString() });
  if (!error) return "invited";
  return /already (registered|exists)|already been registered/i.test(error.message) ? "existing" : "failed";
}

export async function saveMemberPortalAccess(formData: FormData) {
  const { client } = await requireAdmin();
  const parsed = z.object({
    email: z.email().trim().max(254), display_name: z.string().trim().max(120).default(""),
    role: z.enum(["member", "mentor"]), active: z.enum(["true", "false"])
  }).safeParse(Object.fromEntries(formData));
  const teamSlugs = formData.getAll("team_slugs").filter((value): value is string => typeof value === "string");
  if (!parsed.success || teamSlugs.some(slug => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))) redirect("/admin/members?error=validation");
  const { error } = await client.rpc("save_member_portal_access", {
    p_email: parsed.data.email.toLowerCase(), p_display_name: parsed.data.display_name,
    p_role: parsed.data.role, p_active: parsed.data.active === "true", p_team_slugs: [...new Set(teamSlugs)]
  });
  if (error) redirect(`/admin/members?error=${error.code === "PGRST202" || error.code === "42883" ? "migration" : "save"}`);
  const invite = await inviteMemberIfNeeded(parsed.data.email.toLowerCase());
  revalidatePath("/admin/members");
  revalidatePath("/members");
  redirect(`/admin/members?saved=1&invite=${invite}`);
}

export async function saveMemberAnnouncement(formData: FormData) {
  const { user, client } = await requireAdmin();
  const parsed = z.object({ id: optionalId, title: z.string().trim().min(1).max(160), body_markdown: z.string().max(20000), team_id: optionalTeamId, pinned: z.string().optional(), active: z.string().optional() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/member-content?error=validation");
  const values = { title: parsed.data.title, body_markdown: parsed.data.body_markdown, team_id: parsed.data.team_id || null, pinned: parsed.data.pinned === "on", active: parsed.data.active === "on", updated_by: user.id, updated_at: new Date().toISOString() };
  const { error } = parsed.data.id
    ? await client.from("member_announcements").update(values).eq("id", parsed.data.id)
    : await client.from("member_announcements").insert({ ...values, created_by: user.id });
  if (error) redirect("/admin/member-content?error=save");
  revalidatePath("/members"); revalidatePath("/admin/member-content");
  redirect("/admin/member-content?saved=announcement");
}

function easternLocalToIso(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  const desired = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  const getOffset = (instant: number) => {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(instant));
    const valueOf = (type: string) => Number(parts.find(part => part.type === type)?.value);
    return Date.UTC(valueOf("year"), valueOf("month") - 1, valueOf("day"), valueOf("hour"), valueOf("minute")) - instant;
  };
  const first = desired - getOffset(desired);
  return new Date(desired - getOffset(first)).toISOString();
}

export async function saveMemberEvent(formData: FormData) {
  const { user, client } = await requireAdmin();
  const parsed = z.object({ id: optionalId, title: z.string().trim().min(1).max(160), start_at: z.string().min(1), end_at: z.string().optional(), location: z.string().trim().max(240).default(""), details: z.string().trim().max(3000).default(""), team_id: optionalTeamId, active: z.string().optional() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/member-content?error=validation");
  const startAt = easternLocalToIso(parsed.data.start_at);
  const endAt = parsed.data.end_at ? easternLocalToIso(parsed.data.end_at) : null;
  if (!startAt || (parsed.data.end_at && !endAt) || (endAt && endAt < startAt)) redirect("/admin/member-content?error=validation");
  const values = { title: parsed.data.title, start_at: startAt, end_at: endAt, location: parsed.data.location, details: parsed.data.details, team_id: parsed.data.team_id || null, active: parsed.data.active === "on", updated_by: user.id, updated_at: new Date().toISOString() };
  const { error } = parsed.data.id
    ? await client.from("member_events").update(values).eq("id", parsed.data.id)
    : await client.from("member_events").insert({ ...values, created_by: user.id });
  if (error) redirect("/admin/member-content?error=save");
  revalidatePath("/members"); revalidatePath("/admin/member-content");
  redirect("/admin/member-content?saved=event");
}

export async function saveMemberResource(formData: FormData) {
  const { user, client } = await requireAdmin();
  const parsed = z.object({ id: optionalId, title: z.string().trim().min(1).max(160), description: z.string().trim().max(500).default(""), category: z.string().trim().min(1).max(60).default("General"), url: z.string().trim().max(1000).default(""), asset_id: optionalId, team_id: optionalTeamId, active: z.string().optional() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success || (!!parsed.data.url === !!parsed.data.asset_id) || (parsed.data.url && !/^https:\/\//i.test(parsed.data.url))) redirect("/admin/member-content?error=validation");
  const values = { title: parsed.data.title, description: parsed.data.description, category: parsed.data.category, url: parsed.data.url || null, asset_id: parsed.data.asset_id || null, team_id: parsed.data.team_id || null, active: parsed.data.active === "on", updated_by: user.id, updated_at: new Date().toISOString() };
  const { error } = parsed.data.id
    ? await client.from("member_resources").update(values).eq("id", parsed.data.id)
    : await client.from("member_resources").insert({ ...values, created_by: user.id });
  if (error) redirect("/admin/member-content?error=save");
  revalidatePath("/members"); revalidatePath("/admin/member-content");
  redirect("/admin/member-content?saved=resource");
}
