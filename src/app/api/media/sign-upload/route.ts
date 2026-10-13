import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createR2Client } from "@/lib/r2";
import { createClient, getCmsUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const types: Record<string, string[]> = {
  jpg: ["image/jpeg"], jpeg: ["image/jpeg"], png: ["image/png"], webp: ["image/webp"], gif: ["image/gif"],
  pdf: ["application/pdf"], mp4: ["video/mp4"], webm: ["video/webm"], zip: ["application/zip", "application/x-zip-compressed"],
  step: ["application/step", "application/octet-stream"], stp: ["application/step", "application/octet-stream"],
  stl: ["model/stl", "application/sla", "application/octet-stream"], obj: ["model/obj", "text/plain", "application/octet-stream"],
  "3mf": ["model/3mf", "application/octet-stream"], dxf: ["image/vnd.dxf", "application/dxf", "application/octet-stream"]
};

export async function POST(request: Request) {
  const user = await getCmsUser();
  if (!user) return NextResponse.json({ error: "Sign in with an approved CMS account." }, { status: 401 });
  const parsed = z.object({ name: z.string().min(1).max(255), size: z.number().int().positive().max(100 * 1024 * 1024), type: z.string().max(150) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a file smaller than 100 MB." }, { status: 400 });
  const ext = parsed.data.name.split(".").pop()?.toLowerCase() ?? "";
  if (!types[ext]?.includes(parsed.data.type)) return NextResponse.json({ error: "That file type is not supported." }, { status: 415 });
  const supabase = await createClient();
  const { data: { session } } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
  const r2 = createR2Client(session?.access_token);
  const bucket = process.env.R2_BUCKET;
  if (!r2 || !bucket) return NextResponse.json({ error: "R2 storage is not configured. See the project setup guide." }, { status: 503 });
  const objectKey = `team-media/${crypto.randomUUID()}.${ext}`;
  const command = new PutObjectCommand({ Bucket: bucket, Key: objectKey, ContentType: parsed.data.type, ContentLength: parsed.data.size });
  const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 60 });
  return NextResponse.json({ uploadUrl, objectKey, contentType: parsed.data.type });
}
