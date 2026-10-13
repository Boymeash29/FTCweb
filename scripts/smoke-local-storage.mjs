import { randomUUID } from "node:crypto";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";

const apiUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const email = process.env.LOCAL_ADMIN_EMAIL;
const password = process.env.LOCAL_ADMIN_PASSWORD;
const endpoint = process.env.R2_ENDPOINT;
const bucket = process.env.R2_BUCKET;

if (!apiUrl || !publishableKey || !email || !password || !endpoint || !bucket) {
  throw new Error("Local storage smoke check requires the local credentials in .env.local.");
}
if (!new URL(apiUrl).hostname.match(/^(localhost|127\.0\.0\.1)$/) || !new URL(endpoint).hostname.match(/^(localhost|127\.0\.0\.1)$/)) {
  throw new Error("Refusing to run a storage smoke check against a non-loopback service.");
}

const supabase = createClient(apiUrl, publishableKey, { auth: { autoRefreshToken: false, persistSession: false } });
const { data, error } = await supabase.auth.signInWithPassword({ email, password });
if (error || !data.session) throw error ?? new Error("Local CMS admin sign-in did not return a session.");
const { data: member, error: roleError } = await supabase
  .from("cms_users")
  .select("role,active")
  .eq("id", data.user.id)
  .maybeSingle();
if (roleError || member?.role !== "admin" || !member.active) {
  throw roleError ?? new Error("Local CMS admin is missing an active admin allowlist entry.");
}

const s3 = new S3Client({
  region: process.env.R2_REGION ?? "local",
  endpoint,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "stub",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? publishableKey,
    sessionToken: data.session.access_token
  }
});

const key = `local-smoke-tests/${randomUUID()}.txt`;
const body = "local storage smoke check";
try {
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: "text/plain" }));
  const result = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const actual = await result.Body.transformToString();
  if (actual !== body) throw new Error("Local storage returned different object contents.");
  console.log("Local S3 upload and download passed.");
} finally {
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
