import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { seasons } from "@/lib/content";
import { getSitePage } from "@/lib/site-pages";
import SitePageBody from "@/components/SitePageBody";

export async function generateMetadata(){const page=await getSitePage("seasons");return {title:page.title,description:page.intro};}
export default async function SeasonsPage() { const page=await getSitePage("seasons");return <main id="main-content"><section className="page-intro wrap"><div className="eyebrow"><span className="eyebrow-line"/>{page.eyebrow}</div><h1>{page.title}<span className="period">.</span></h1><p className="lead">{page.intro}</p></section>{page.bodyMarkdown&&<section className="wrap"><SitePageBody source={page.bodyMarkdown} format={page.bodyFormat}/></section>}<section className="season-list wrap"><div className="season-list-head"><span>SEASON</span><span>STATUS</span><span>DETAILS</span></div>{seasons.map(s=><Link href={`/seasons/${s.slug}`} className="season-row" key={s.slug}><span><small>{s.year}</small><b>{s.name}</b></span><span className="current-status"><i/>CURRENT SEASON</span><span className="season-open">View season <ArrowUpRight size={16}/></span></Link>)}{!page.bodyMarkdown&&page.sections.map(s=><div className="season-empty" key={s.title}><b>{s.title}</b><p>{s.body}</p></div>)}</section></main>; }
