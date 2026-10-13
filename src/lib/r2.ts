import { S3Client } from "@aws-sdk/client-s3";

export function createR2Client(sessionToken?: string) {
  const account = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const customEndpoint = process.env.R2_ENDPOINT;
  if ((!account && !customEndpoint) || !accessKeyId || !secretAccessKey) return null;
  return new S3Client({
    region: process.env.R2_REGION ?? "auto",
    endpoint: customEndpoint ?? `https://${account}.r2.cloudflarestorage.com`,
    forcePathStyle: Boolean(customEndpoint),
    credentials: { accessKeyId, secretAccessKey, ...(customEndpoint && sessionToken ? { sessionToken } : {}) }
  });
}
