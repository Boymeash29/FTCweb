import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPublicSeasons, seasonBelongsToTeam } from "@/lib/seasons";
import { getTeam } from "@/lib/teams";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params; const team = await getTeam(slug);
  return team ? { title: `${team.name} robots · Team ${team.number}`, description: `Robot builds and season records for ${team.name}, FIRST Tech Challenge Team ${team.number}.` } : {};
}

export default async function TeamRobotsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [team, seasons, client] = await Promise.all([getTeam(slug), getPublicSeasons(), createClient()]);
  if (!team) notFound();
  const teamSeasons = seasons.filter(season => seasonBelongsToTeam(season, team));
  const seasonIds = teamSeasons.flatMap(season => season.id ? [season.id] : []);
  const { data: robots } = client && seasonIds.length ? await client.from("robots").select("id,name,summary,season_id").in("season_id", seasonIds).eq("status", "published").order("name") : { data: [] };
  return <main id="main-content" className="team-profile wrap">
    <Link className="text-link" href={`/teams/${team.slug}`}><ArrowLeft size={15}/> {team.name} · Team {team.number}</Link>
    <header className="team-profile-heading"><span className="section-tag">ROBOT ARCHIVE · TEAM {team.number}</span><h1>{team.name}<span className="period">.</span></h1><p>Every robot build is documented with the season, design decisions, and tests that shaped it.</p><div className="team-profile-shortcuts"><Link href={`/teams/${team.slug}/engineering`}>Engineering portfolio <ArrowUpRight size={14}/></Link><Link href="/teams">Both teams <ArrowUpRight size={14}/></Link></div></header>
    {teamSeasons.map(season => {
      const seasonRobots = (robots ?? []).filter(robot => robot.season_id === season.id);
      return <section className="team-profile-section" key={season.slug}><div className="team-profile-section-heading"><span className="section-tag">{season.current ? "CURRENT SEASON" : "SEASON ARCHIVE"} · {season.year}</span><Link href={`/seasons/${season.slug}`}>{season.name} archive <ArrowUpRight size={14}/></Link></div><h2 className="team-directory-heading">{season.name}</h2>
        {seasonRobots.length ? <div className="team-profile-grid">{seasonRobots.map(robot=><article className="team-profile-card" key={robot.id}><small>TEAM {team.number} · {season.name}</small><b>{robot.name}</b>{robot.summary&&<p>{robot.summary}</p>}</article>)}</div> : <p className="team-profile-empty">Robot details for {season.name} have not been published yet.</p>}
      </section>;
    })}
    {!teamSeasons.length && <section className="team-profile-section"><p className="team-profile-empty">This team’s season archive will appear here when its first season is added.</p></section>}
  </main>;
}
