import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getSitePage } from "@/lib/site-pages";
import { getPublicSeasons } from "@/lib/seasons";
import SitePageBody from "@/components/SitePageBody";

export async function generateMetadata() {
  const page = await getSitePage("seasons");
  return { title: page.title, description: page.intro };
}

export default async function SeasonsPage() {
  const [page, seasons] = await Promise.all([getSitePage("seasons"), getPublicSeasons()]);
  return <main id="main-content">
    <section className="page-intro wrap"><div className="eyebrow"><span className="eyebrow-line"/>{page.eyebrow}</div><h1>{page.title}<span className="period">.</span></h1><p className="lead">{page.intro}</p></section>
    {page.bodyMarkdown && <section className="wrap"><SitePageBody source={page.bodyMarkdown} format={page.bodyFormat}/></section>}
    <section className="season-list wrap"><div className="season-list-head"><span>SEASON</span><span>STATUS</span><span>DETAILS</span></div>
      {seasons.map(season=><Link href={`/seasons/${season.slug}`} className="season-row" key={season.slug}>
        <span><small>{season.teamName ? `${season.teamName} · Team ${season.teamNumber} · ${season.year}` : `Shared · ${season.year}`}</small><b>{season.name}</b></span>
        <span className="current-status"><i/>{season.current ? "CURRENT SEASON" : "SEASON ARCHIVE"}</span>
        <span className="season-open">View season <ArrowUpRight size={16}/></span>
      </Link>)}
      {!seasons.length && <p className="admin-empty">Season details are being prepared.</p>}
      {!page.bodyMarkdown && page.sections.map(section=><div className="season-empty" key={section.title}><b>{section.title}</b><p>{section.body}</p></div>)}
    </section>
  </main>;
}
