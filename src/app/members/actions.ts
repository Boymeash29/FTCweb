"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";

export async function requestMemberSignIn(formData: FormData) {
  const parsed = z.object({ email: z.email().trim().max(254) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/members/login?error=email");
  const client = await createClient();
  if (!client) redirect("/members/login?error=setup");
  const callback = new URL("/auth/callback?next=%2Fmembers", getSiteUrl());
  const { error } = await client.auth.signInWithOtp({
    email: parsed.data.email.toLowerCase(),
    options: { emailRedirectTo: callback.toString(), shouldCreateUser: false }
  });
  if (error) redirect("/members/login?error=send");
  redirect("/members/login?sent=1");
}

export async function signOutMember() {
  const client = await createClient();
  await client?.auth.signOut();
  redirect("/members");
}
