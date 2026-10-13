import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
const email = process.env.LOCAL_ADMIN_EMAIL;
const password = process.env.LOCAL_ADMIN_PASSWORD;

if (!url || !key || !email || !password || !/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(url)) {
  throw new Error("Local admin setup only runs against a loopback Supabase URL configured in .env.local.");
}

const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
const { data: existing, error: lookupError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (lookupError) throw lookupError;

let user = existing.users.find(candidate => candidate.email?.toLowerCase() === email.toLowerCase());
if (!user) {
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  user = data.user;
} else {
  const { data, error } = await admin.auth.admin.updateUserById(user.id, { password, email_confirm: true });
  if (error) throw error;
  user = data.user;
}

const { error: allowlistError } = await admin
  .from("cms_users")
  .upsert({ id: user.id, email, role: "admin", active: true }, { onConflict: "id" });
if (allowlistError) throw allowlistError;

const { error: signInError } = await admin.auth.signInWithPassword({ email, password });
if (signInError) throw signInError;

console.log(`Local CMS admin ready: ${email}`);
