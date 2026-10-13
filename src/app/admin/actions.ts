"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient, getCmsUser } from "@/lib/supabase/server";
import { canEditEntry, canMakeMediaPublic, canManageCmsUsers, canPublishContent } from "@/lib/permissions";
import { getSitePageDefinition } from "@/lib/site-pages";

const blockSchema = z.array(z.discriminatedUnion("type", [
  z.object({ type: z.literal("heading"), text: z.string().trim().min(1).max(120) }),
  z.object({ type: z.literal("paragraph"), text: z.string().trim().min(1).max(5000) }),
  z.object({ type: z.literal("list"), items: z.array(z.string().trim().min(1).max(500)).min(1).max(30) }),
  z.object({ type: z.literal("quote"), text: z.string().trim().min(1).max(2000), attribution: z.string().trim().max(120).optional() }),
  z.object({ type: z.literal("code"), language: z.string().trim().max(30), code: z.string().max(12000) }),
  z.object({ type: z.literal("link"), label: z.string().trim().min(1).max(120), href: z.string().trim().max(500).refine(value => value.startsWith("/") && !value.startsWith("//") || /^https:\/\//i.test(value), "Use an HTTPS URL or a same-site path") })
])).max(80);
const entrySchema = z.object({ title: z.string().trim().min(3).max(140), slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(160), type: z.enum(["news", "journal", "project"]), summary: z.string().trim().max(500), body_markdown: z.string().max(100000), status: z.enum(["draft", "scheduled", "published"]), scheduled_at: z.string().optional() });
const sitePageSchema = z.object({ key: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), title: z.string().trim().min(1).max(140), eyebrow: z.string().trim().max(120), intro: z.string().trim().max(2000), body_markdown: z.string().max(100000), body_format: z.enum(["markdown", "html"]) });

export async function updateMechanism(formData: FormData) {
  const user = await getCmsUser();
  if (user?.role !== "admin") redirect("/admin/login?error=access");
  const parsed = z.object({ slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), name: z.string().trim().min(1).max(140), purpose: z.string().trim().max(2000), requirements: z.string().max(20000), design_rationale: z.string().trim().max(5000), implementation: z.string().max(20000), testing: z.string().max(20000), body_markdown: z.string().max(100000), status: z.enum(["draft", "published", "archived"]) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/mechanisms?error=validation");
  let requirements: unknown; let implementation: unknown; let testing: unknown;
  try { requirements=JSON.parse(parsed.data.requirements); implementation=JSON.parse(parsed.data.implementation); testing=JSON.parse(parsed.data.testing); } catch { redirect(`/admin/mechanisms/${parsed.data.slug}?error=validation`); }
  const jsonValue = z.union([z.array(z.unknown()), z.record(z.string(), z.unknown()), z.string()]);
  if (!jsonValue.safeParse(requirements).success || !jsonValue.safeParse(implementation).success || !jsonValue.safeParse(testing).success) redirect(`/admin/mechanisms/${parsed.data.slug}?error=validation`);
  const supabase = await createClient();
  if (!supabase) redirect("/admin/login?error=setup");
  const { error }=await supabase.from("mechanisms").update({ name:parsed.data.name,purpose:parsed.data.purpose,requirements,design_rationale:parsed.data.design_rationale,implementation,testing,body_markdown:parsed.data.body_markdown,updated_by:user.id,status:parsed.data.status,published_at:parsed.data.status==="published"?new Date().toISOString():null,updated_at:new Date().toISOString() }).eq("slug",parsed.data.slug);
  if (error) redirect(`/admin/mechanisms/${parsed.data.slug}?error=save`);
  revalidatePath(`/mechanisms/${parsed.data.slug}`); revalidatePath("/mechanisms"); revalidatePath("/admin/mechanisms");
  redirect(`/admin/mechanisms/${parsed.data.slug}?saved=1`);
}

export async function saveSitePage(formData: FormData) {
  const user = await getCmsUser();
  if (user?.role !== "admin") redirect("/admin/login?error=access");
  const parsed = sitePageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/pages?error=validation");
  const definition = getSitePageDefinition(parsed.data.key);
  if (!definition) redirect("/admin/pages?error=validation");
  const supabase = await createClient();
  if (!supabase) redirect("/admin/login?error=setup");
  const { data: existing, error: readError } = await supabase.from("site_pages").select("sections,links").eq("page_key", parsed.data.key).maybeSingle();
  if (readError) redirect(`/admin/pages/${parsed.data.key}?error=save`);
  const sections = Array.isArray(existing?.sections) && existing.sections.length > 0 ? existing.sections : definition.fallback.sections;
  const links = Array.isArray(existing?.links) && existing.links.length > 0 ? existing.links : definition.fallback.links;
  const { error } = await supabase.from("site_pages").upsert({ page_key: parsed.data.key, title: parsed.data.title, eyebrow: parsed.data.eyebrow, intro: parsed.data.intro, sections, links, body_markdown: parsed.data.body_markdown, body_format: parsed.data.body_format, status: "published", updated_by: user.id, updated_at: new Date().toISOString() }, { onConflict: "page_key" });
  if (error) redirect(`/admin/pages/${parsed.data.key}?error=save`);
  const page = getSitePageDefinition(parsed.data.key);
  if (!page) redirect("/admin/pages?error=validation");
  revalidatePath(page.path);
  revalidatePath("/admin/pages");
  redirect(`/admin/pages/${parsed.data.key}?saved=1`);
}

function parseEntry(formData: FormData) {
  const result = entrySchema.safeParse(Object.fromEntries(formData));
  if (!result.success) return null;
  if (result.data.status === "scheduled" && (!result.data.scheduled_at || Number.isNaN(Date.parse(result.data.scheduled_at)))) return null;
  return { ...result.data, body: [] };
}
function scheduledTimestamp(value?: string) { return value ? new Date(`${value}:00.000Z`).toISOString() : null; }
function entryPath(type: "news" | "journal" | "project") { return type === "project" ? "/projects" : `/${type}`; }

export async function createEntry(formData: FormData) {
  const user = await getCmsUser();
  if (!user) redirect("/admin/login?error=access");
  const parsed = parseEntry(formData);
  if (!parsed) redirect("/admin?error=validation");
  if (parsed.status !== "draft" && !canPublishContent(user.role)) redirect("/admin?error=save");
  const supabase = await createClient();
  if (!supabase) redirect("/admin/login?error=setup");
  const { error } = await supabase.from("content_entries").insert({ title: parsed.title, slug: parsed.slug, type: parsed.type, summary: parsed.summary, body: parsed.body, body_markdown: parsed.body_markdown, status: parsed.status, author_id: user.id, updated_by: user.id, published_at: parsed.status === "published" ? new Date().toISOString() : null, scheduled_at: parsed.status === "scheduled" ? scheduledTimestamp(parsed.scheduled_at) : null });
  if (error) redirect(`/admin?error=${encodeURIComponent(error.code === "23505" ? "duplicate" : "save")}`);
  revalidatePath("/admin");
  revalidatePath(entryPath(parsed.type));
  redirect("/admin?saved=1");
}

export async function updateEntry(formData: FormData) {
  const user = await getCmsUser();
  if (!user) redirect("/admin/login?error=access");
  const id = z.string().uuid().safeParse(formData.get("id"));
  const parsed = parseEntry(formData);
  if (!id.success || !parsed) redirect("/admin?error=validation");
  if (parsed.status !== "draft" && !canPublishContent(user.role)) redirect("/admin?error=save");
  const supabase = await createClient();
  if (!supabase) redirect("/admin/login?error=setup");
  const { data: existing } = await supabase.from("content_entries").select("status").eq("id", id.data).maybeSingle();
  if (!existing) redirect("/admin?error=missing");
  if (!canEditEntry(user.role, existing.status)) redirect("/admin?error=permission");
  const { error } = await supabase.from("content_entries").update({ title: parsed.title, slug: parsed.slug, type: parsed.type, summary: parsed.summary, body: parsed.body, body_markdown: parsed.body_markdown, status: parsed.status, updated_by: user.id, published_at: parsed.status === "published" ? new Date().toISOString() : null, scheduled_at: parsed.status === "scheduled" ? scheduledTimestamp(parsed.scheduled_at) : null }).eq("id", id.data);
  if (error) redirect(`/admin?error=${encodeURIComponent(error.code === "23505" ? "duplicate" : "save")}`);
  revalidatePath("/admin");
  revalidatePath(entryPath(parsed.type));
  revalidatePath(`${entryPath(parsed.type)}/${parsed.slug}`);
  redirect(`/admin/content/${id.data}?saved=1`);
}

export async function restoreRevision(formData: FormData) {
  const user = await getCmsUser();
  if (user?.role !== "admin") redirect("/admin/login?error=access");
  const parsed = z.object({ entryId: z.string().uuid(), revisionId: z.string().uuid() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin?error=validation");
  const supabase = await createClient();
  if (!supabase) redirect("/admin/login?error=setup");
  const { data: revision } = await supabase.from("content_revisions").select("snapshot").eq("id", parsed.data.revisionId).eq("entry_id", parsed.data.entryId).maybeSingle();
  if (!revision) redirect("/admin?error=revision");
  const snapshot = z.object({ title: z.string(), slug: z.string(), summary: z.string(), body: blockSchema, body_markdown: z.string().nullable().optional(), type: z.enum(["news", "journal", "project"]), status: z.enum(["draft", "scheduled", "published"]), published_at: z.string().nullable().optional(), scheduled_at: z.string().nullable().optional() }).safeParse(revision.snapshot);
  if (!snapshot.success) redirect("/admin?error=revision");
  const { error } = await supabase.from("content_entries").update({ ...snapshot.data, body_markdown: snapshot.data.body_markdown ?? null, updated_by: user.id }).eq("id", parsed.data.entryId);
  if (error) redirect("/admin?error=save");
  await supabase.from("audit_logs").insert({ actor_id: user.id, action: "revision_restored", entity_type: "content_entry", entity_id: parsed.data.entryId, details: { revision_id: parsed.data.revisionId } });
  revalidatePath("/admin");
  redirect(`/admin/content/${parsed.data.entryId}?restored=1`);
}

export async function archiveEntry(formData: FormData) {
  const user = await getCmsUser();
  if (user?.role !== "admin") redirect("/admin/login?error=access");
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) redirect("/admin?error=validation");
  const supabase = await createClient();
  if (!supabase) redirect("/admin/login?error=setup");
  await supabase.from("content_entries").update({ status: "archived", published_at: null, scheduled_at: null, updated_by: user.id }).eq("id", id.data);
  revalidatePath("/admin");
  redirect("/admin?archived=1");
}

export async function saveCmsUser(formData: FormData) {
  const actor = await getCmsUser();
  if (!actor || !canManageCmsUsers(actor.role)) redirect("/admin/login?error=access");
  const parsed = z.object({ id: z.string().uuid(), email: z.email(), role: z.enum(["admin", "editor"]), active: z.enum(["true", "false"]) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/users?error=validation");
  if (parsed.data.id === actor.id) redirect("/admin/users?error=self");
  const supabase = await createClient();
  if (!supabase) redirect("/admin/login?error=setup");
  const { data: currentUsers } = await supabase.from("cms_users").select("id,role,active");
  const target = currentUsers?.find(item => item.id === parsed.data.id);
  const remainsAdmin = parsed.data.role === "admin" && parsed.data.active === "true";
  if (target?.role === "admin" && target.active && !remainsAdmin && (currentUsers ?? []).filter(item => item.role === "admin" && item.active).length <= 1) redirect("/admin/users?error=lastadmin");
  const values = { id: parsed.data.id, email: parsed.data.email, role: parsed.data.role, active: parsed.data.active === "true" };
  const { error } = await supabase.from("cms_users").upsert(values, { onConflict: "id" });
  if (error) redirect(`/admin/users?error=${encodeURIComponent(error.code === "23503" ? "authuser" : "save")}`);
  await supabase.from("audit_logs").insert({ actor_id: actor.id, action: target ? "cms_user_updated" : "cms_user_approved", entity_type: "cms_user", entity_id: parsed.data.id, details: { role: values.role, active: values.active } });
  revalidatePath("/admin/users");
  redirect("/admin/users?saved=1");
}

export async function recordMediaAsset(formData: FormData): Promise<{ ok: boolean; message: string }> {
  const user = await getCmsUser();
  if (!user) return { ok: false, message: "Sign in with an approved CMS account." };
  const parsed = z.object({
    object_key: z.string().regex(/^team-media\/[0-9a-f-]{36}\.[a-z0-9]+$/i),
    title: z.string().trim().min(1).max(160), mime_type: z.string().max(150), byte_size: z.coerce.number().int().positive().max(100 * 1024 * 1024),
    width: z.coerce.number().int().min(0).max(30000).default(0), height: z.coerce.number().int().min(0).max(30000).default(0),
    caption: z.string().trim().max(500).default(""), alt_text: z.string().trim().max(500).default(""), creator_credit: z.string().trim().max(160).default(""),
    season_id: z.union([z.literal(""), z.string().uuid()]).default(""), is_public: z.enum(["true", "false"]).default("false")
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Review the media title, file details, and alt text." };
  const supabase = await createClient();
  if (!supabase) return { ok: false, message: "Supabase is not configured." };
  const { error } = await supabase.from("media_assets").insert({
    object_key: parsed.data.object_key, title: parsed.data.title, mime_type: parsed.data.mime_type, byte_size: parsed.data.byte_size,
    width: parsed.data.width || null, height: parsed.data.height || null, caption: parsed.data.caption || null,
    alt_text: parsed.data.alt_text || null, creator_credit: parsed.data.creator_credit || null,
    season_id: parsed.data.season_id || null, is_public: canMakeMediaPublic(user.role) && parsed.data.is_public === "true", created_by: user.id
  });
  if (error) return { ok: false, message: error.code === "23503" ? "Choose a season that exists in the CMS." : "The upload finished, but metadata could not be saved. Contact an admin to recover the file." };
  revalidatePath("/admin/media");
  return { ok: true, message: "File uploaded and added to the media library." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase?.auth.signOut();
  redirect("/admin/login");
}
