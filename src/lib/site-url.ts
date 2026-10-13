/** Resolve the canonical site origin across local, Vercel Preview, and Production. */
export function getSiteUrl(): URL {
  const configured = process.env.NEXT_PUBLIC_SITE_URL
    ?? (process.env.VERCEL_ENV === "preview" ? process.env.VERCEL_URL : undefined)
    ?? process.env.VERCEL_PROJECT_PRODUCTION_URL
    ?? process.env.VERCEL_URL
    ?? "http://localhost:3000";

  return new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(configured) ? configured : `https://${configured}`);
}
