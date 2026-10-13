import { currentSeason, type Season, seasons as fallbackSeasons } from "@/lib/content";
import { createClient } from "@/lib/supabase/server";

type SeasonRow = {
  id: string;
  name: string;
  slug: string;
  year_label: string | null;
  start_date: string | null;
  end_date: string | null;
  summary: string;
  is_current: boolean;
  status: "draft" | "published" | "archived";
};

function toSeason(row: SeasonRow): Season {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    year: row.year_label || row.start_date?.slice(0, 4) || "Season archive",
    summary: row.summary || "Season details will be added as the team documents its work.",
    current: row.is_current,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status
  };
}

export async function getPublicSeasons(): Promise<Season[]> {
  const client = await createClient();
  if (!client) return fallbackSeasons;
  const { data, error } = await client.from("seasons")
    .select("id,name,slug,year_label,start_date,end_date,summary,is_current,status")
    .eq("status", "published")
    .order("start_date", { ascending: false, nullsFirst: false });
  if (error || !data?.length) return fallbackSeasons;
  return data.map(row => toSeason(row as SeasonRow));
}

export async function getPublicSeason(slug: string): Promise<Season | null> {
  const client = await createClient();
  if (client) {
    const { data } = await client.from("seasons")
      .select("id,name,slug,year_label,start_date,end_date,summary,is_current,status")
      .eq("slug", slug).eq("status", "published").maybeSingle();
    if (data) return toSeason(data as SeasonRow);
  }
  const fallback = fallbackSeasons.find(season => season.slug === slug);
  return fallback ? { ...fallback, current: fallback.slug === currentSeason.slug } : null;
}
