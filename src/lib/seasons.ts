import { currentSeason, type Season, seasons as fallbackSeasons } from "@/lib/content";
import { createClient } from "@/lib/supabase/server";

type SeasonRow = {
  id: string; name: string; slug: string; year_label: string | null;
  start_date: string | null; end_date: string | null; summary: string;
  is_current: boolean; status: "draft" | "published" | "archived"; team_id?: string | null;
  teams?: { name: string; number: string; slug: string } | null;
};

function toSeason(row: SeasonRow): Season {
  const team = Array.isArray(row.teams) ? row.teams[0] : row.teams;
  return {
    id: row.id, name: row.name, slug: row.slug,
    year: row.year_label || row.start_date?.slice(0, 4) || (row.is_current ? "Current" : "Year not set"),
    summary: row.summary || "Season details will be added as the team documents its work.",
    current: row.is_current, startDate: row.start_date, endDate: row.end_date, status: row.status,
    teamId: row.team_id ?? undefined,
    teamName: team?.name,
    teamNumber: team?.number,
    teamSlug: team?.slug
  };
}

export function seasonBelongsToTeam(season: Season, team: { id?: string; slug: string }) {
  if (season.teamId) return season.teamId === team.id;
  return season.teamSlug ? season.teamSlug === team.slug : true;
}
const seasonSelect = "id,name,slug,year_label,start_date,end_date,summary,is_current,status,team_id,teams(name,number,slug)";

export async function getPublicSeasons(): Promise<Season[]> {
  const client = await createClient();
  if (!client) return fallbackSeasons;
  const { data, error } = await client.from("seasons").select(seasonSelect).eq("status", "published").order("start_date", { ascending: false, nullsFirst: false });
  if (error) return fallbackSeasons;
  return (data ?? []).map(row => toSeason(row as unknown as SeasonRow));
}

export async function getCurrentSeasons(): Promise<Season[]> {
  const client = await createClient();
  if (!client) return [currentSeason];
  const { data, error } = await client.from("seasons").select(seasonSelect).eq("status", "published").eq("is_current", true).order("name");
  if (error) return [currentSeason];
  return (data ?? []).map(row => toSeason(row as unknown as SeasonRow));
}

export async function getCurrentSeason(): Promise<Season> {
  return (await getCurrentSeasons())[0] ?? currentSeason;
}

export async function getPublicSeason(slug: string): Promise<Season | null> {
  const client = await createClient();
  if (client) {
    const { data, error } = await client.from("seasons").select(seasonSelect).eq("slug", slug).eq("status", "published").maybeSingle();
    if (error) return fallbackSeasons.find(season => season.slug === slug) ?? null;
    return data ? toSeason(data as unknown as SeasonRow) : null;
  }
  const fallback = fallbackSeasons.find(season => season.slug === slug);
  return fallback ? { ...fallback, current: fallback.slug === currentSeason.slug } : null;
}
