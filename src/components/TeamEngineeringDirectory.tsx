import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPublicSeasons } from "@/lib/seasons";
import { getTeams } from "@/lib/teams";

type WorkItem = { title: string; summary: string | null; label: string; href: string; season?: string | null };

export default async function TeamEngineeringDirectory({ kind = "all" }: { kind?: "all" | "software" | "projects" }) {
  const [teams, seasons, client] = await Promise.all([getTeams(), getPublicSeasons(), createClient()]);
  const seasonById = new Map(seasons.filter(season => season.id).map(season => [season.id!, season]));
  const seasonIds = [...seasonById.keys()];
  const [projectResult, entryResult, mechanismResult, softwareResult] = await Promise.all([
    client && seasonIds.length && kind !== "software" ? client.from("engineering_projects").select("title,slug,summary,season_id").in("season_id", seasonIds).eq("status", "published").order("title") : Promise.resolve({ data: [] }),
    client && kind !== "software" ? client.from("published_content_entries").select("title,slug,summary,team_id,season_id").eq("type", "project").order("published_at", { ascending: false }) : Promise.resolve({ data: [] }),
    client && seasonIds.length && kind === "all" ? client.from("mechanisms").select("name,slug,purpose,season_id").in("season_id", seasonIds).eq("status", "published").order("sort_order") : Promise.resolve({ data: [] }),
    client && seasonIds.length ? client.from("software_documents").select("title,slug,summary,category,season_id").in("season_id", seasonIds).eq("status", "published").order("title") : Promise.resolve({ data: [] })
  ]);

  const workByTeam = new Map<string, WorkItem[]>();
  for (const team of teams) workByTeam.set(team.id ?? `slug:${team.slug}`, []);
  const sharedWork: WorkItem[] = [];
  const add = (teamId: string | null | undefined, item: WorkItem) => {
    const season = item.season ? seasons.find(value => value.id === item.season) : undefined;
    const ownerId = teamId ?? season?.teamId;
    const team = teams.find(value => value.id === ownerId);
    if (!team) {
      if (season && !season.teamId && !season.teamSlug) {
        for (const sharedTeam of teams) workByTeam.get(sharedTeam.id ?? `slug:${sharedTeam.slug}`)?.push({ ...item, season: season.name });
      } else if (!ownerId) sharedWork.push(item);
      return;
    }
    const key = team.id ?? `slug:${team.slug}`;
    workByTeam.get(key)?.push({ ...item, season: season?.name });
  };

  for (const item of projectResult.data ?? []) add(undefined, { title: item.title, summary: item.summary, label: "ENGINEERING PROJECT", href: `/engineering/projects/${item.slug}`, season: item.season_id });
  for (const item of entryResult.data ?? []) add(item.team_id, { title: item.title, summary: item.summary, label: "PROJECT STORY", href: `/projects/${item.slug}`, season: item.season_id });
  for (const item of mechanismResult.data ?? []) add(undefined, { title: item.name, summary: item.purpose, label: "MECHANISM", href: `/mechanisms/${item.slug}`, season: item.season_id });
  for (const item of softwareResult.data ?? []) add(undefined, { title: item.title, summary: item.summary, label: `SOFTWARE · ${item.category.toUpperCase()}`, href: `/software/${item.slug}`, season: item.season_id });

  return <section className="team-work-directory wrap" aria-label={kind === "software" ? "Software work by team" : "Engineering work by team"}>
    {teams.map(team => {
      const items = workByTeam.get(team.id ?? `slug:${team.slug}`) ?? [];
      const visible = kind === "software" ? items.filter(item => item.label.startsWith("SOFTWARE")) : kind === "projects" ? items.filter(item => item.label === "ENGINEERING PROJECT" || item.label === "PROJECT STORY") : items;
      return <section className="team-work-group" id={`team-${team.slug}`} key={team.slug}>
        <header><span className="section-tag">TEAM {team.number}</span><h2>{team.name}<span className="period">.</span></h2><p>{kind === "software" ? `Software documentation for ${team.name}.` : kind === "projects" ? `Engineering projects published by ${team.name}.` : `Projects, mechanisms, and software published by ${team.name}.`}</p><div className="team-profile-shortcuts"><Link href={`/teams/${team.slug}/robot`}>Robot archive <ArrowUpRight size={14}/></Link><Link href={`/teams/${team.slug}/engineering`}>Engineering portfolio <ArrowUpRight size={14}/></Link></div></header>
        {visible.length ? <div className="team-profile-grid">{visible.map((item, index) => <Link className="team-profile-card" href={item.href} key={`${item.href}-${index}`}>
          <small>{item.label}{item.season ? ` · ${item.season}` : ""}</small><b>{item.title}<ArrowUpRight size={16}/></b>{item.summary && <p>{item.summary}</p>}
        </Link>)}</div> : <p className="team-profile-empty">Published {kind === "software" ? "software notes" : "engineering work"} for {team.name} will appear here as the team adds it to a season.</p>}
      </section>;
    })}
    {kind !== "software" && sharedWork.length > 0 && <section className="team-work-group"><header><span className="section-tag">SEVEN HILLS FTC · SHARED</span><h2>Shared work<span className="period">.</span></h2><p>Published engineering items that are not assigned to one team.</p></header><div className="team-profile-grid">{sharedWork.map((item,index)=><Link className="team-profile-card" href={item.href} key={`${item.href}-${index}`}><small>{item.label}</small><b>{item.title}<ArrowUpRight size={16}/></b>{item.summary&&<p>{item.summary}</p>}</Link>)}</div></section>}
  </section>;
}
