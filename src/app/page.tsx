import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight } from "lucide-react";
import { getSitePage, homeSectionsFromBody } from "@/lib/site-pages";
import SitePageBody from "@/components/SitePageBody";
import TeamCards from "@/components/TeamCards";
import { getTeams } from "@/lib/teams";

export async function generateMetadata(){const page=await getSitePage("home");return {title:page.title,description:page.intro};}

export default async function Home() {
 const [page, teams]=await Promise.all([getSitePage("home"),getTeams()]);
 const titleLines=page.title.split(" ");
 const homeSections=(page.bodyMarkdown?homeSectionsFromBody(page.bodyMarkdown,page.bodyFormat):page.sections)
  .filter(section=>!/(who we are|current season)$/i.test(section.title));
 const sectionFormat=page.bodyMarkdown?page.bodyFormat:"markdown";
 return <main id="main-content">
  <section className="hero wrap"><div className="hero-kicker"><span className="live-dot"/>SEVEN HILLS SCHOOL · FIRST TECH CHALLENGE</div><div className="hero-title-row"><h1>{titleLines.slice(0,-1).join(" ")}<br/><span>{titleLines.at(-1)}</span><b className="period">.</b></h1><div className="hero-side"><span className="team-label">FTC TEAMS</span><strong>{String(teams.length).padStart(2,"0")}</strong><p>{teams.map(team=><span key={team.slug}>{team.name} · {team.number}<br/></span>)}</p></div></div><div className="hero-bottom"><Link className="hero-caption" href="/teams"><ArrowDown size={15}/> MEET THE TEAMS <ArrowRight size={14}/></Link><Link className="hero-season" href="/engineering">EXPLORE OUR WORK <b>↗</b></Link></div><div className="hero-grid-art" aria-hidden="true"><div className="crosshair crosshair-a"/><div className="crosshair crosshair-b"/><span>SH / FTC<br/>TEAM STORIES</span></div></section>
  <section className="teams-home wrap"><div className="teams-home-heading"><span className="section-tag">OUR TEAMS</span><h2>Our teams.<br/><em>One community.</em></h2><p>Different identities. One Seven Hills FTC community.</p></div><TeamCards compact teams={teams}/></section>
  {homeSections.map((section,index)=><section className="work-section wrap" key={section.title}><div className="section-heading"><div><span className="section-tag">0{index+1} / {section.title.toUpperCase()}</span><h2>{section.title}</h2></div><SitePageBody source={section.body} format={sectionFormat}/></div></section>)}
  <section className="closing-cta wrap"><span className="section-tag">FOLLOW ALONG</span><div>{page.links.slice(2).map(link=><Link key={link.href} className="text-link" href={link.href}>{link.title}<ArrowUpRight size={15}/></Link>)}</div></section>
 </main>;
}
