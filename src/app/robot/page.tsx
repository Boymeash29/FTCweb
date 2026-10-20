import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import PageFrame from "@/components/PageFrame";
import { getTeams } from "@/lib/teams";
import { getPublicSeasons, seasonBelongsToTeam } from "@/lib/seasons";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(){return {title:"Robots · Seven Hills FTC",description:"Explore the robot work of both Seven Hills FTC teams."};}

export default async function RobotPage(){
  const [teams,seasons,client]=await Promise.all([getTeams(),getPublicSeasons(),createClient()]);
  const seasonIds=seasons.flatMap(season=>season.id?[season.id]:[]);
  const {data:robots}=client&&seasonIds.length?await client.from("robots").select("id,name,summary,season_id").in("season_id",seasonIds).eq("status","published").order("name"):{data:[]};
  const seasonFor=(id:string)=>seasons.find(season=>season.id===id);
  return <main id="main-content"><PageFrame pageKey="robot" asMain={false}/><section className="team-robots wrap" aria-label="Robots by team">{teams.map(team=>{const teamSeasons=seasons.filter(season=>seasonBelongsToTeam(season,team));const teamRobots=(robots??[]).filter(robot=>teamSeasons.some(season=>season.id===robot.season_id));return <section className="team-profile-section" key={team.slug}><div className="team-profile-section-heading"><span className="section-tag">TEAM {team.number}</span><Link href={`/teams/${team.slug}/robot`}>Open {team.name} robot page <ArrowUpRight size={14}/></Link></div><h2 className="team-directory-heading">{team.name}</h2>{teamRobots.length?<div className="team-profile-grid">{teamRobots.map(robot=>{const season=seasonFor(robot.season_id);return <Link className="team-profile-card" href={season?`/seasons/${season.slug}#robots`:`/teams/${team.slug}/robot`} key={robot.id}><small>{season?.name??"SEASON"}{season?.current?" · CURRENT SEASON":""}</small><b>{robot.name}<ArrowUpRight size={16}/></b>{robot.summary&&<p>{robot.summary}</p>}</Link>})}</div>:<div className="team-profile-grid"><Link className="team-profile-card" href={`/teams/${team.slug}/robot`}><small>{teamSeasons.find(season=>season.current)?"CURRENT SEASON":"TEAM PROFILE"}</small><b>{team.name} robot work<ArrowUpRight size={16}/></b><p>Explore this team’s seasons, robot builds, and engineering decisions.</p></Link></div>}</section>})}</section></main>;
}
