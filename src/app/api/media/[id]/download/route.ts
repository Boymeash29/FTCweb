import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createR2Client } from "@/lib/r2";
import { createClient, getCmsUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Storage is not configured" }, { status: 503 });
  const { data } = await supabase.from("media_assets").select("object_key,is_public").eq("id", id).maybeSingle();
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  let accessToken: string | undefined;
  if (!data.is_public) {
    if (!(await getCmsUser())) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const { data: { session } } = await supabase.auth.getSession();
    accessToken = session?.access_token;
  }
  if (data.is_public && !process.env.R2_ENDPOINT) {
    const base = process.env.R2_PUBLIC_BASE_URL;
    if (!base) return NextResponse.json({ error: "Public media delivery is not configured" }, { status: 503 });
    return NextResponse.redirect(`${base.replace(/\/$/, "")}/${data.object_key.split("/").map(encodeURIComponent).join("/")}`);
  }
  const r2 = createR2Client(accessToken);
  const bucket = process.env.R2_BUCKET;
  if (!r2 || !bucket) return NextResponse.json({ error: "Private storage is not configured" }, { status: 503 });
  const url = await getSignedUrl(r2, new GetObjectCommand({ Bucket: bucket, Key: data.object_key }), { expiresIn: 60 });
  return NextResponse.redirect(url);
}
