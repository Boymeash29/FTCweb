import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { seasons } from "@/lib/content";
import { getPublicSeason } from "@/lib/seasons";
import { getSitePage, getSitePageDefinition } from "@/lib/site-pages";
import SitePageBody from "@/components/SitePageBody";

export function generateStaticParams() { return seasons.map(season => ({ slug: season.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const season = await getPublicSeason(slug);
  if (!season) return {};
  const definition = getSitePageDefinition(`season-${slug}`);
  if (!definition) return { title: season.name, description: season.summary };
  const page = await getSitePage(`season-${slug}`);
  return { title: page.title, description: page.intro };
}

export default async function SeasonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const season = await getPublicSeason(slug);
  if (!season) notFound();
  const definition = getSitePageDefinition(`season-${slug}`);
  const page = definition ? await getSitePage(`season-${slug}`) : null;
  const seasonTitle = page?.title ?? season.name;
  const seasonIntro = page?.intro || season.summary;
  const cards = [
    { title: "Robot & mechanisms", href: "/robot", desc: "Robot overview and technical documentation" },
    { title: "Engineering portfolio", href: "/engineering", desc: "Design process, projects, and evidence" },
    { title: "Software", href: "/software", desc: "Architecture and programming notes" },
    { title: "Journal & news", href: "/journal", desc: "Build progress and team updates" },
    { title: "Competitions", href: "/competitions", desc: "Schedule and confirmed results" },
    { title: "Outreach", href: "/outreach", desc: "Approved community events" }
  ];

  return <main id="main-content">
    <section className="season-hero wrap">
      <div className="eyebrow"><span className="eyebrow-line"/>{season.current ? "Current season" : "Season archive"} · {season.year}</div>
      <h1>{seasonTitle}<span className="period">.</span></h1><p className="lead">{seasonIntro}</p>
      {season.current && <span className="season-current-label"><i/>CURRENT SEASON</span>}
      {(season.startDate || season.endDate) && <p className="season-date-range">{season.startDate || "Date TBD"}{season.endDate ? ` – ${season.endDate}` : ""}</p>}
    </section>
    {page?.bodyMarkdown ? <section className="season-detail wrap"><SitePageBody source={page.bodyMarkdown} format={page.bodyFormat}/></section> : <section className="season-detail wrap">
      <span className="section-tag">SEASON CONTENT</span>
      <div className="season-detail-grid">{cards.map(card=><Link key={card.title} href={card.href} className="season-detail-card"><small>{card.desc}</small><b>{card.title}<ArrowUpRight size={16}/></b><span>CONTENT AWAITING TEAM DOCUMENTATION</span></Link>)}</div>
      {page?.sections.map(section=><article className="content-block" key={section.title}><h2>{section.title}</h2><p>{section.body}</p></article>)}
    </section>}
  </main>;
}
