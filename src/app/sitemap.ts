import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";
import { getTeams } from "@/lib/teams";
import { getPublicSeasons } from "@/lib/seasons";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl().origin;
  const [teams, seasons] = await Promise.all([getTeams(), getPublicSeasons()]);
  const paths = ["", "teams", "roster", "robot", "engineering", "mechanisms", "software", "seasons", "journal", "news", "projects", "outreach", "sponsors", "competitions", "contact", "privacy", "accessibility"];
  const teamPaths = teams.flatMap(team => [`teams/${team.slug}`, `teams/${team.slug}/robot`, `teams/${team.slug}/engineering`]);
  const fixed = [...paths, ...teamPaths, ...seasons.map(season => `seasons/${season.slug}`)].map(path => ({
    url: path ? new URL(`/${path}`, base).toString() : base,
    lastModified: new Date(),
    changeFrequency: (path === "" ? "weekly" : "monthly") as "weekly" | "monthly",
    priority: path === "" ? 1 : path.startsWith("teams/") || path.startsWith("seasons/") ? 0.7 : 0.6
  }));
  const supabase = await createClient();
  if (!supabase) return fixed;

  const [{ data: entries }, { data: mechanisms }, { data: engineeringProjects }, { data: softwareDocs }] = await Promise.all([
    supabase.from("published_content_entries").select("type,slug,published_at"),
    supabase.from("mechanisms").select("slug,published_at").eq("status", "published"),
    supabase.from("engineering_projects").select("slug,published_at").eq("status", "published"),
    supabase.from("software_documents").select("slug,updated_at").eq("status", "published")
  ]);

  return [
    ...fixed,
    ...(entries ?? []).map(entry => ({ url: new URL(`/${entry.type === "project" ? "projects" : entry.type}/${entry.slug}`, base).toString(), lastModified: entry.published_at ? new Date(entry.published_at) : new Date(), changeFrequency: "monthly" as const, priority: 0.5 })),
    ...(mechanisms ?? []).map(item => ({ url: new URL(`/mechanisms/${item.slug}`, base).toString(), lastModified: item.published_at ? new Date(item.published_at) : new Date(), changeFrequency: "monthly" as const, priority: 0.5 })),
    ...(engineeringProjects ?? []).map(item => ({ url: new URL(`/engineering/projects/${item.slug}`, base).toString(), lastModified: item.published_at ? new Date(item.published_at) : new Date(), changeFrequency: "monthly" as const, priority: 0.5 })),
    ...(softwareDocs ?? []).map(item => ({ url: new URL(`/software/${item.slug}`, base).toString(), lastModified: item.updated_at ? new Date(item.updated_at) : new Date(), changeFrequency: "monthly" as const, priority: 0.5 }))
  ];
}
