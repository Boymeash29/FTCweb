import PageFrame from "@/components/PageFrame";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getSitePage } from "@/lib/site-pages";
import { getTeams } from "@/lib/teams";
import TeamEngineeringDirectory from "@/components/TeamEngineeringDirectory";
export async function generateMetadata(){const page=await getSitePage("engineering");return {title:page.title,description:page.intro};}
export default async function EngineeringPage(){const teams=await getTeams();return <main id="main-content"><PageFrame pageKey="engineering" asMain={false} showBody={false}/><section className="engineering-team-selector wrap" aria-labelledby="engineering-team-selector-title"><div><span className="section-tag">TWO TEAMS · TWO PORTFOLIOS</span><h2 id="engineering-team-selector-title">Choose a team.</h2><p>Each team has its own engineering work, robot, and season history.</p></div><div className="team-cards team-cards-compact">{teams.map(team=><Link className="team-card" href={`/teams/${team.slug}/engineering`} key={team.slug}><span className="team-card-kicker">SEVEN HILLS FTC · TEAM {team.number}</span><span className="team-card-title">{team.name}<ArrowUpRight aria-hidden="true" size={17}/></span><span className="team-card-number">Engineering portfolio</span></Link>)}</div></section><TeamEngineeringDirectory/></main>;}
