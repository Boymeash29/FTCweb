import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import PageFrame from "@/components/PageFrame";
import { getTeams } from "@/lib/teams";
import { getCurrentSeasons } from "@/lib/seasons";

export async function generateMetadata(){return {title:"Robots · Seven Hills FTC",description:"Explore the robot work of both Seven Hills FTC teams."};}

export default async function RobotPage(){
  const [teams,seasons]=await Promise.all([getTeams(),getCurrentSeasons()]);
  return <><PageFrame pageKey="robot"/><section className="team-robots wrap"><div className="team-profile-section-heading"><span className="section-tag">ROBOTS BY TEAM</span><Link href="/teams">Meet both teams <ArrowUpRight size={14}/></Link></div><div className="team-profile-grid">{teams.map(team=>{const season=seasons.find(item=>item.teamSlug===team.slug);return <Link className="team-profile-card" href={season?`/seasons/${season.slug}`:`/teams/${team.slug}`} key={team.slug}><small>TEAM {team.number}{season?.current?" · CURRENT SEASON":""}</small><b>{team.name}<ArrowUpRight size={16}/></b><p>{season?`${season.name}: ${season.summary}`:"Explore this team’s profile, seasons, and engineering work."}</p></Link>})}</div></section></>;
}
