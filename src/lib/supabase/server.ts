import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return createServerClient(url, key, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(values) { try { values.forEach(({ name, value, options }) => { cookieStore.set(name, value, options); }); } catch { /* Server components cannot write cookies. */ } }
    }
  });
}

export async function getCmsUser() {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("cms_users").select("role,active").eq("id", user.id).maybeSingle();
  if (!data?.active) return null;
  return { id: user.id, email: user.email ?? "", role: data.role as "admin" | "editor" };
}
