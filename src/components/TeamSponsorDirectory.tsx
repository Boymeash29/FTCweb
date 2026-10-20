import { createClient } from "@/lib/supabase/server";
import { getPublicSeasons, seasonBelongsToTeam } from "@/lib/seasons";
import { getTeams } from "@/lib/teams";

export default async function TeamSponsorDirectory() {
  const [teams,seasons,client]=await Promise.all([getTeams(),getPublicSeasons(),createClient()]);
  const seasonIds=seasons.flatMap(season=>season.id?[season.id]:[]);
  const [{data:sponsors},{data:seasonSponsors}]=await Promise.all([
    client?client.from("sponsors").select("id,name,slug,description,website_url").eq("status","published").order("name"):Promise.resolve({data:[]}),
    client&&seasonIds.length?client.from("season_sponsors").select("season_id,sponsor_id").in("season_id",seasonIds):Promise.resolve({data:[]})
  ]);
  const sponsorById=new Map((sponsors??[]).map(sponsor=>[sponsor.id,sponsor]));
  return <section className="team-work-directory wrap" aria-label="Sponsors by team">{teams.map(team=>{
    const teamSeasonIds=new Set(seasons.filter(season=>seasonBelongsToTeam(season,team)).flatMap(season=>season.id?[season.id]:[]));
    const ids=new Set((seasonSponsors??[]).filter(row=>teamSeasonIds.has(row.season_id)).map(row=>row.sponsor_id));
    const items=[...ids].flatMap(id=>{const sponsor=sponsorById.get(id);return sponsor?[sponsor]:[]});
    return <section className="team-work-group" key={team.slug}><header><span className="section-tag">TEAM {team.number}</span><h2>{team.name}<span className="period">.</span></h2></header>{items.length?<div className="team-profile-grid">{items.map(sponsor=><article className="team-profile-card" key={sponsor.id}><small>SUPPORTING {team.name}</small><b>{sponsor.name}</b>{sponsor.description&&<p>{sponsor.description}</p>}{sponsor.website_url&&<a className="text-link" href={sponsor.website_url} target="_blank" rel="noreferrer">Sponsor website ↗</a>}</article>)}</div>:<p className="team-profile-empty">Published sponsor acknowledgements for {team.name} will appear here.</p>}</section>;
  })}</section>;
}
