"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient, getCmsUser } from "@/lib/supabase/server";

const seasonSchema = z.object({
  id: z.union([z.literal(""), z.string().uuid()]),
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100),
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
  const client = await createClient();
  if (!client) redirect("/admin/login?error=setup");
  const { data, error } = await client.rpc("save_cms_season", {
    p_id: parsed.data.id || null,
    p_name: parsed.data.name,
    p_slug: parsed.data.slug,
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
  revalidatePath(`/seasons/${parsed.data.slug}`);
  revalidatePath("/admin/seasons");
  redirect("/admin/seasons?saved=1");
}
