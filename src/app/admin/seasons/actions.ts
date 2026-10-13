"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient, getCmsUser } from "@/lib/supabase/server";

const seasonSchema = z.object({
  id: z.union([z.literal(""), z.string().uuid()]),
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().max(100),
  year_label: z.string().trim().max(40),
  start_date: z.string().refine(value => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value)),
  end_date: z.string().refine(value => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value)),
  summary: z.string().trim().max(2000),
  is_current: z.enum(["true", "false"]),
  status: z.enum(["draft", "published", "archived"])
});

export async function saveSeason(formData: FormData) {
  const user = await getCmsUser();
  if (user?.role !== "admin") redirect("/admin/login?error=access");
  const parsed = seasonSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || (parsed.data.start_date && parsed.data.end_date && parsed.data.end_date < parsed.data.start_date)) {
    redirect(`/admin/seasons?error=validation${formData.get("id") ? `&edit=${encodeURIComponent(String(formData.get("id")))}` : ""}`);
  }
  const slug = (parsed.data.slug || `${parsed.data.name} ${parsed.data.year_label}`).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) redirect("/admin/seasons?error=validation");
  const client = await createClient();
  if (!client) redirect("/admin/login?error=setup");
  const { data, error } = await client.rpc("save_cms_season", {
    p_id: parsed.data.id || null,
    p_name: parsed.data.name,
    p_slug: slug,
    p_year_label: parsed.data.year_label,
    p_start_date: parsed.data.start_date || null,
    p_end_date: parsed.data.end_date || null,
    p_summary: parsed.data.summary,
    p_is_current: parsed.data.is_current === "true",
    p_status: parsed.data.status
  });
  if (error || !data) {
    const query = error?.code === "23505" ? "duplicate" : "save";
    redirect(`/admin/seasons?error=${query}`);
  }
  revalidatePath("/seasons");
  revalidatePath(`/seasons/${slug}`);
  revalidatePath("/admin/seasons");
  redirect(parsed.data.id ? `/admin/seasons/${data}?saved=1` : "/admin/seasons?saved=1");
}

export async function restoreSeasonRevision(formData: FormData) {
  const user = await getCmsUser();
  if (user?.role !== "admin") redirect("/admin/login?error=access");
  const parsed = z.object({ id: z.string().uuid(), revisionId: z.string().uuid() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/seasons?error=revision");
  const client = await createClient();
  if (!client) redirect("/admin/login?error=setup");
  const { data: revision } = await client.from("season_revisions").select("snapshot").eq("id", parsed.data.revisionId).eq("season_id", parsed.data.id).maybeSingle();
  const snapshot = z.object({ name: z.string().min(1).max(120), slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), year_label: z.string().nullable(), start_date: z.string().nullable(), end_date: z.string().nullable(), summary: z.string(), is_current: z.boolean(), status: z.enum(["draft", "published", "archived"]) }).safeParse(revision?.snapshot);
  if (!snapshot.success) redirect(`/admin/seasons/${parsed.data.id}?error=revision`);
  const { error } = await client.rpc("save_cms_season", { p_id: parsed.data.id, p_name: snapshot.data.name, p_slug: snapshot.data.slug, p_year_label: snapshot.data.year_label ?? "", p_start_date: snapshot.data.start_date, p_end_date: snapshot.data.end_date, p_summary: snapshot.data.summary, p_is_current: snapshot.data.is_current, p_status: snapshot.data.status });
  if (error) redirect(`/admin/seasons/${parsed.data.id}?error=save`);
  await client.from("audit_logs").insert({ actor_id: user.id, action: "revision_restored", entity_type: "season", entity_id: parsed.data.id, details: { revision_id: parsed.data.revisionId } });
  revalidatePath("/");
  revalidatePath("/seasons");
  revalidatePath(`/seasons/${snapshot.data.slug}`);
  revalidatePath("/admin/seasons");
  redirect(`/admin/seasons/${parsed.data.id}?restored=1`);
}
