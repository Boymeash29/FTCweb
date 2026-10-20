import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPublicSeasons, seasonBelongsToTeam } from "@/lib/seasons";
import { getTeam } from "@/lib/teams";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params; const team = await getTeam(slug);
  return team ? { title: `${team.name} engineering · Team ${team.number}`, description: `Engineering portfolio for ${team.name}, FIRST Tech Challenge Team ${team.number}.` } : {};
}

export default async function TeamEngineeringPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [team, seasons, client] = await Promise.all([getTeam(slug), getPublicSeasons(), createClient()]);
  if (!team) notFound();
  const teamSeasons = seasons.filter(season => seasonBelongsToTeam(season, team));
  const seasonIds = teamSeasons.flatMap(season => season.id ? [season.id] : []);
  const [projects, entries, mechanisms, software] = await Promise.all([
    client && seasonIds.length ? client.from("engineering_projects").select("id,title,slug,summary,season_id").in("season_id", seasonIds).eq("status", "published").order("title") : Promise.resolve({ data: [] }),
    client ? client.from("published_content_entries").select("title,slug,summary,team_id,season_id").eq("type", "project").order("published_at", { ascending: false }) : Promise.resolve({ data: [] }),
    client && seasonIds.length ? client.from("mechanisms").select("id,name,slug,purpose,season_id").in("season_id", seasonIds).eq("status", "published").order("sort_order") : Promise.resolve({ data: [] }),
    client && seasonIds.length ? client.from("software_documents").select("id,title,slug,summary,category,season_id").in("season_id", seasonIds).eq("status", "published").order("title") : Promise.resolve({ data: [] })
  ]);
  const seasonName = (id: string | null) => teamSeasons.find(season => season.id === id)?.name ?? "Shared work";
  const visibleEntries=(entries.data??[]).filter(item=>item.team_id===team.id || (!item.team_id && teamSeasons.some(season=>season.id===item.season_id && !season.teamId && !season.teamSlug)));
  const teamWideEntries=visibleEntries.filter(item=>item.team_id===team.id&&!item.season_id);
  return <main id="main-content" className="team-profile wrap">
    <Link className="text-link" href={`/teams/${team.slug}`}><ArrowLeft size={15}/> {team.name} · Team {team.number}</Link>
    <header className="team-profile-heading"><span className="section-tag">ENGINEERING PORTFOLIO · TEAM {team.number}</span><h1>{team.name}<span className="period">.</span></h1><p>Design, build, test, and iteration from {team.name}, organized by season.</p><div className="team-profile-shortcuts"><Link href={`/teams/${team.slug}/robot`}>Robot archive <ArrowUpRight size={14}/></Link><Link href="/teams">Both teams <ArrowUpRight size={14}/></Link></div></header>
    {teamSeasons.map(season => {
      const seasonProjects=(projects.data??[]).filter(item=>item.season_id===season.id);
      const seasonMechanisms=(mechanisms.data??[]).filter(item=>item.season_id===season.id);
      const seasonSoftware=(software.data??[]).filter(item=>item.season_id===season.id);
      const seasonEntries=visibleEntries.filter(item=>item.season_id===season.id);
      const hasWork=seasonProjects.length||seasonMechanisms.length||seasonSoftware.length||seasonEntries.length;
      return <section className="team-profile-section" key={season.slug}><div className="team-profile-section-heading"><span className="section-tag">{season.current?"CURRENT SEASON":"SEASON ARCHIVE"} · {season.year}</span><Link href={`/seasons/${season.slug}`}>{season.name} archive <ArrowUpRight size={14}/></Link></div><h2 className="team-directory-heading">{season.name}</h2>
        {hasWork ? <div className="team-profile-grid">
          {seasonProjects.map(item=><Link className="team-profile-card" href={`/engineering/projects/${item.slug}`} key={`project-${item.id}`}><small>ENGINEERING PROJECT · {seasonName(item.season_id)}</small><b>{item.title}<ArrowUpRight size={16}/></b>{item.summary&&<p>{item.summary}</p>}</Link>)}
          {seasonEntries.map(item=><Link className="team-profile-card" href={`/projects/${item.slug}`} key={`entry-${item.slug}`}><small>PROJECT STORY · {seasonName(item.season_id)}</small><b>{item.title}<ArrowUpRight size={16}/></b>{item.summary&&<p>{item.summary}</p>}</Link>)}
          {seasonMechanisms.map(item=><Link className="team-profile-card" href={`/mechanisms/${item.slug}`} key={`mechanism-${item.id}`}><small>MECHANISM · {seasonName(item.season_id)}</small><b>{item.name}<ArrowUpRight size={16}/></b>{item.purpose&&<p>{item.purpose}</p>}</Link>)}
          {seasonSoftware.map(item=><Link className="team-profile-card" href={`/software/${item.slug}`} key={`software-${item.id}`}><small>SOFTWARE · {item.category} · {seasonName(item.season_id)}</small><b>{item.title}<ArrowUpRight size={16}/></b>{item.summary&&<p>{item.summary}</p>}</Link>)}
        </div> : <p className="team-profile-empty">Published engineering work for {team.name} in {season.name} will appear here.</p>}
      </section>;
    })}
    {teamWideEntries.length>0&&<section className="team-profile-section"><div className="team-profile-section-heading"><span className="section-tag">TEAM-WIDE PROJECTS</span></div><div className="team-profile-grid">{teamWideEntries.map(item=><Link className="team-profile-card" href={`/projects/${item.slug}`} key={item.slug}><small>PROJECT STORY · {team.name}</small><b>{item.title}<ArrowUpRight size={16}/></b>{item.summary&&<p>{item.summary}</p>}</Link>)}</div></section>}
    {!teamSeasons.length && <section className="team-profile-section"><p className="team-profile-empty">This team’s engineering portfolio will appear here when its first season is added.</p></section>}
  </main>;
}
