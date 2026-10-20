import { ArrowUpRight } from "lucide-react";
import PageFrame from "@/components/PageFrame";
import { createClient } from "@/lib/supabase/server";
import { getTeams } from "@/lib/teams";

export async function generateMetadata(){return {title:"Competitions · Seven Hills FTC",description:"Competition schedules and verified results from the Seven Hills FTC teams."};}
export default async function CompetitionsPage(){
 const client=await createClient();
 const [{data:events},teams]=await Promise.all([client?client.from("competition_events").select("id,name,slug,event_date,location,official_url,season_id,seasons(team_id)").eq("status","published").order("event_date",{ascending:false}):Promise.resolve({data:null}),getTeams()]);
 const teamFor=(id:string|null)=>teams.find(team=>team.id===id);
 return <><PageFrame pageKey="competitions"/><section className="entry-feed wrap"><span className="section-tag">SCHEDULE & RESULTS</span>{events?.length?<div className="entry-feed-grid">{events.map(event=>{const season=Array.isArray(event.seasons)?event.seasons[0]:event.seasons;const team=teamFor(season?.team_id??null);return <article className="entry-feed-card" key={event.id}><span>{team?`${team.name} · ${team.number}`:"Seven Hills FTC · Shared"}{event.event_date?` · ${new Date(`${event.event_date}T12:00:00`).toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})}`:""}</span><h2>{event.name}</h2><p>{event.location||"Location to be announced"}</p>{event.official_url&&<a className="text-link" href={event.official_url} target="_blank" rel="noreferrer">Official event page <ArrowUpRight size={14}/></a>}</article>})}</div>:<div className="entry-feed-empty"><h2>Event details are being prepared.</h2><p>Each schedule and result will be connected to the team and season it belongs to.</p></div>}</section></>;
}
