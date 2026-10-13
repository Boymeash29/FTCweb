import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl().origin;
  const paths = ["", "robot", "engineering", "mechanisms", "software", "team", "seasons", "seasons/biobuzz", "journal", "news", "projects", "outreach", "sponsors", "competitions", "contact", "privacy", "accessibility"];
  const fixed = paths.map(path => ({
    url: path ? new URL(`/${path}`, base).toString() : base,
    lastModified: new Date(),
    changeFrequency: (path === "" ? "weekly" : "monthly") as "weekly" | "monthly",
    priority: path === "" ? 1 : 0.6
  }));
  const supabase = await createClient();
  if (!supabase) return fixed;

  const [{ data }, { data: mechanisms }] = await Promise.all([
    supabase.from("published_content_entries").select("type,slug,published_at"),
    supabase.from("mechanisms").select("slug,published_at").eq("status", "published")
  ]);

  return [
    ...fixed,
    ...(data ?? []).map(entry => ({
      url: new URL(`/${entry.type === "project" ? "projects" : entry.type}/${entry.slug}`, base).toString(),
      lastModified: entry.published_at ? new Date(entry.published_at) : new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.5
    })),
    ...(mechanisms ?? []).map(item => ({
      url: new URL(`/mechanisms/${item.slug}`, base).toString(),
      lastModified: item.published_at ? new Date(item.published_at) : new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.5
    }))
  ];
}
