import { createClient } from "@/lib/supabase/server";

export type Team = {
  id?: string;
  slug: string;
  name: string;
  number: string;
  summary: string;
  status?: "draft" | "published" | "archived";
  sortOrder?: number;
};

export const teams: Team[] = [
  { slug: "buzzerbots", name: "BuzzerBots", number: "23826", summary: "Seven Hills FTC Team 23826." },
  { slug: "hive-mind", name: "Hive Mind", number: "36438", summary: "Seven Hills FTC Team 36438." },
];

export async function getTeams(): Promise<Team[]> {
  const client = await createClient();
  if (!client) return teams;
  const { data, error } = await client.from("teams")
    .select("id,slug,name,number,summary,status,sort_order")
    .eq("status", "published").order("sort_order").order("name");
  if (error) return teams;
  return (data ?? []).map(row => ({ id: row.id, slug: row.slug, name: row.name, number: row.number, summary: row.summary || `Seven Hills FTC Team ${row.number}.`, status: row.status, sortOrder: row.sort_order }));
}

export async function getTeam(slug: string): Promise<Team | undefined> {
  const client = await createClient();
  if (client) {
    const { data, error } = await client.from("teams").select("id,slug,name,number,summary,status,sort_order").eq("slug", slug).eq("status", "published").maybeSingle();
    if (error) return teams.find(team => team.slug === slug);
    if (!data) return undefined;
    return { id: data.id, slug: data.slug, name: data.name, number: data.number, summary: data.summary || `Seven Hills FTC Team ${data.number}.`, status: data.status, sortOrder: data.sort_order };
  }
  return teams.find(team => team.slug === slug);
}
