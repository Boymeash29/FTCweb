import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight } from "lucide-react";
import { getSitePage, homeSectionsFromBody } from "@/lib/site-pages";
import { getCurrentSeason } from "@/lib/seasons";
import SitePageBody from "@/components/SitePageBody";

export async function generateMetadata(){const page=await getSitePage("home");return {title:page.title,description:page.intro};}

export default async function Home() {
 const [page,currentSeason]=await Promise.all([getSitePage("home"),getCurrentSeason()]);
 const titleLines=page.title.split(" ");
 const homeSections=page.bodyMarkdown?homeSectionsFromBody(page.bodyMarkdown,page.bodyFormat):page.sections;
 const sectionFormat=page.bodyMarkdown?page.bodyFormat:"markdown";
 return <main id="main-content">
  <section className="hero wrap"><div className="hero-kicker"><span className="live-dot"/>{page.eyebrow}</div><div className="hero-title-row"><h1>{titleLines.slice(0,-1).join(" ")}<br/><span>{titleLines.at(-1)}</span><b className="period">.</b></h1><div className="hero-side"><span className="team-label">TEAM NUMBER</span><strong>23826</strong><p>{page.intro}</p></div></div><div className="hero-bottom"><Link className="hero-caption" href="/robot"><ArrowDown size={15}/> EXPLORE OUR WORK <ArrowRight size={14}/></Link><Link className="hero-season" href={`/seasons/${currentSeason.slug}`}>CURRENT SEASON <b>{currentSeason.name.toUpperCase()}</b> <span className="season-dot"/></Link></div><div className="hero-grid-art" aria-hidden="true"><div className="crosshair crosshair-a"/><div className="crosshair crosshair-b"/><span>SH / FTC<br/>23826</span></div></section>
  {homeSections.map((section,index)=><section className={index===0?"intro-strip wrap":index===1?"robot-feature":"work-section wrap"} key={section.title}>
   {index===0?<><span className="section-tag">01 / {section.title.toUpperCase()}</span><div><SitePageBody source={section.body} format={sectionFormat}/>{page.links[0]&&<Link className="text-link" href={page.links[0].href}>{page.links[0].title}<ArrowUpRight size={15}/></Link>}</div></>:index===1?<div className="wrap robot-inner"><div className="feature-label"><span className="section-tag">02 / {section.title.toUpperCase()}</span><span className="season-chip">{currentSeason.name}</span></div><div className="robot-copy"><div className="eyebrow">A work in progress <span className="eyebrow-line"/></div><h2>{section.title}</h2><SitePageBody source={section.body} format={sectionFormat}/>{page.links[1]&&<Link className="button-link" href={page.links[1].href}>{page.links[1].title}<ArrowRight size={16}/></Link>}</div><div className="robot-visual" role="img" aria-label="Robot photography placeholder"><div className="visual-frame"><span className="frame-coordinate">SEVEN HILLS FTC<br/>TEAM 23826</span><div className="frame-placeholder"><span className="placeholder-cross">+</span><span>ROBOT IMAGE<br/>AWAITING TEAM MEDIA</span></div><span className="frame-index">FIG. 01 — CURRENT ROBOT</span></div></div></div>:<div className="section-heading"><div><span className="section-tag">0{index+1} / {section.title.toUpperCase()}</span><h2>{section.title}</h2></div><SitePageBody source={section.body} format={sectionFormat}/></div>}
  </section>)}
  <section className="closing-cta wrap"><span className="section-tag">FOLLOW ALONG</span><div>{page.links.slice(2).map(link=><Link key={link.href} className="text-link" href={link.href}>{link.title}<ArrowUpRight size={15}/></Link>)}</div></section>
 </main>;
}
