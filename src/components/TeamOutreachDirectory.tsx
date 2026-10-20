import { createClient } from "@/lib/supabase/server";
import { getPublicSeasons } from "@/lib/seasons";
import { getTeams } from "@/lib/teams";

export default async function TeamOutreachDirectory() {
  const [teams, seasons, client] = await Promise.all([getTeams(), getPublicSeasons(), createClient()]);
  const seasonIds = seasons.flatMap(season => season.id ? [season.id] : []);
  const { data } = client && seasonIds.length ? await client.from("outreach_events").select("id,name,event_date,description,season_id").in("season_id", seasonIds).eq("status", "published").order("event_date", { ascending: false }) : { data: [] };
  return <section className="team-work-directory wrap" aria-label="Outreach by team">{teams.map(team => {
    const teamSeasons=seasons.filter(season=>season.teamSlug===team.slug || (team.id && season.teamId===team.id));
    const ids=new Set(teamSeasons.flatMap(season=>season.id?[season.id]:[]));
    const events=(data??[]).filter(event=>ids.has(event.season_id));
    return <section className="team-work-group" key={team.slug}><header><span className="section-tag">TEAM {team.number}</span><h2>{team.name}<span className="period">.</span></h2><p>Community outreach led by {team.name}.</p></header>{events.length?<div className="team-profile-grid">{events.map(event=><article className="team-profile-card" key={event.id}><small>{team.name}{event.event_date?` · ${new Date(`${event.event_date}T12:00:00`).toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric"})}`:""}</small><b>{event.name}</b>{event.description&&<p>{event.description}</p>}</article>)}</div>:<p className="team-profile-empty">Published outreach updates for {team.name} will appear here.</p>}</section>;
  })}</section>;
}
