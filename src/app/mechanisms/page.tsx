import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getTeams } from "@/lib/teams";
import SitePageHeading from "@/components/SitePageHeading";
import { getSitePage } from "@/lib/site-pages";
export async function generateMetadata(){const page=await getSitePage("mechanisms");return {title:page.title,description:page.intro};}
export default async function MechanismsPage(){
 const client=await createClient();
 const [{data}, {data:seasons}, teams]=await Promise.all([client?client.from("mechanisms").select("name,slug,purpose,season_id").eq("status","published").order("sort_order"):Promise.resolve({data:null}),client?client.from("seasons").select("id,name,team_id").eq("status","published"):Promise.resolve({data:null}),getTeams()]);
 const seasonById=new Map((seasons??[]).map(season=>[season.id,season]));
 return <main id="main-content"><SitePageHeading pageKey="mechanisms"/><section className="team-work-directory wrap" aria-label="Mechanisms by team">{teams.map(team=>{const teamSeasons=(seasons??[]).filter(season=>season.team_id===team.id||!season.team_id);const seasonIds=new Set(teamSeasons.map(season=>season.id));const items=(data??[]).filter(item=>seasonIds.has(item.season_id));return <section className="team-work-group" key={team.slug}><header><span className="section-tag">TEAM {team.number}</span><h2>{team.name}<span className="period">.</span></h2><p>Mechanism designs published by {team.name}.</p><Link className="text-link" href={`/teams/${team.slug}/engineering`}>Engineering portfolio <ArrowUpRight size={14}/></Link></header>{items.length?<div className="team-profile-grid">{items.map(item=>{const season=seasonById.get(item.season_id);return <Link className="team-profile-card" href={`/mechanisms/${item.slug}`} key={item.slug}><small>{season?.name??"Season"}</small><b>{item.name}<ArrowUpRight size={16}/></b><p>{item.purpose}</p></Link>})}</div>:<p className="team-profile-empty">Published mechanism pages for {team.name} will appear here.</p>}</section>})}</section></main>;
}
