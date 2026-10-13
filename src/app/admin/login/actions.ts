"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const credentialsSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(8).max(128),
});

export async function signInWithPassword(formData: FormData) {
  const parsed = credentialsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/login?error=credentials");
  const supabase = await createClient();
  if (!supabase) redirect("/admin/login?error=setup");

  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) redirect("/admin/login?error=credentials");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    await supabase.auth.signOut();
    redirect("/admin/login?error=credentials");
  }
  const { data: access } = await supabase.from("cms_users").select("active").eq("id", user.id).maybeSingle();
  if (!access?.active) {
    await supabase.auth.signOut();
    redirect("/admin/login?error=access");
  }
  redirect("/admin");
}
