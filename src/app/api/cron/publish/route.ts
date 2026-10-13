import { timingSafeEqual } from "node:crypto";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret) return NextResponse.json({ error: "Publishing job is not configured" }, { status: 503 });
  const expected = Buffer.from(secret);
  const token = Buffer.from(supplied);
  if (token.length !== expected.length || !timingSafeEqual(token, expected)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: "Publishing job is not configured" }, { status: 503 });
  const supabase = createSupabaseClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const now = new Date().toISOString();
  const { data, error } = await supabase.from("content_entries").update({ status: "published", published_at: now }).eq("status", "scheduled").lte("scheduled_at", now).select("type,slug");
  if (error) return NextResponse.json({ error: "Unable to publish scheduled entries" }, { status: 500 });
  for (const entry of data ?? []) {
    const route = entry.type === "journal" ? "journal" : entry.type === "project" ? "projects" : "news";
    revalidatePath(`/${route}`);
    revalidatePath(`/${route}/${entry.slug}`);
  }
  return NextResponse.json({ published: data?.length ?? 0, checkedAt: now });
}
