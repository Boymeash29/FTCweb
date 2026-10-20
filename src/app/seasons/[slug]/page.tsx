import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { seasons } from "@/lib/content";
import { getPublicSeason } from "@/lib/seasons";
import { getSitePage, getSitePageDefinition } from "@/lib/site-pages";
import { createClient } from "@/lib/supabase/server";
import SitePageBody from "@/components/SitePageBody";

export function generateStaticParams() { return seasons.map(season => ({ slug: season.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const season = await getPublicSeason(slug); if (!season) return {};
  const definition = getSitePageDefinition(`season-${slug}`);
  if (!definition) return { title: season.name, description: season.summary };
  const page = await getSitePage(`season-${slug}`); return { title: page.title, description: page.intro };
}

export default async function SeasonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const season = await getPublicSeason(slug); if (!season) notFound();
  const definition = getSitePageDefinition(`season-${slug}`); const page = definition ? await getSitePage(`season-${slug}`) : null;
  const client = await createClient();
  const [{ data: entries }, { data: robots }, { data: engineeringProjects }, { data: mechanisms }, { data: softwareDocs }, { data: events }] = await Promise.all([
    client && season.id ? client.from("published_content_entries").select("title,slug,type,summary,published_at").eq("season_id", season.id).order("published_at", { ascending: false }) : Promise.resolve({ data: null }),
    client && season.id ? client.from("robots").select("id,name,summary").eq("season_id", season.id).eq("status", "published").order("name") : Promise.resolve({ data: null }),
    client && season.id ? client.from("engineering_projects").select("id,title,slug,summary").eq("season_id", season.id).eq("status", "published").order("title") : Promise.resolve({ data: null }),
    client && season.id ? client.from("mechanisms").select("name,slug,purpose").eq("season_id", season.id).eq("status", "published").order("sort_order") : Promise.resolve({ data: null }),
    client && season.id ? client.from("software_documents").select("title,slug,summary,category").eq("season_id", season.id).eq("status", "published").order("title") : Promise.resolve({ data: null }),
    client && season.id ? client.from("competition_events").select("id,name,event_date,location,official_url").eq("season_id", season.id).eq("status", "published").order("event_date", { ascending: false }) : Promise.resolve({ data: null })
  ]);
  const cards = [
    ...(entries ?? []).map(entry => ({ title: entry.title, href: `/${entry.type === "project" ? "projects" : entry.type}/${entry.slug}`, type: entry.type.toUpperCase(), summary: entry.summary })),
    ...(engineeringProjects ?? []).map(item => ({ title: item.title, href: `/engineering/projects/${item.slug}`, type: "ENGINEERING PROJECT", summary: item.summary })),
    ...(mechanisms ?? []).map(item => ({ title: item.name, href: `/mechanisms/${item.slug}`, type: "MECHANISM", summary: item.purpose })),
    ...(softwareDocs ?? []).map(item => ({ title: item.title, href: `/software/${item.slug}`, type: `SOFTWARE · ${item.category}`, summary: item.summary }))
  ];

  return <main id="main-content">
    <section className="season-hero wrap">
      <div className="eyebrow"><span className="eyebrow-line" />{season.current ? "Current season" : "Season archive"} · {season.year}</div>
      <h1>{page?.title ?? season.name}<span className="period">.</span></h1>
      <p className="lead">{page?.intro || season.summary}</p>
      {season.teamName && season.teamSlug ? <Link className="text-link season-team-link" href={`/teams/${season.teamSlug}`}>{season.teamName} · Team {season.teamNumber}<ArrowUpRight size={14} /></Link> : <div className="team-profile-shortcuts"><Link href="/teams/buzzerbots">BuzzerBots 23826 <ArrowUpRight size={14}/></Link><Link href="/teams/hive-mind">Hive Mind 36438 <ArrowUpRight size={14}/></Link></div>}
      {season.current && <span className="season-current-label"><i />CURRENT SEASON</span>}
      {(season.startDate || season.endDate) && <p className="season-date-range">{season.startDate || "Date TBD"}{season.endDate ? ` – ${season.endDate}` : ""}</p>}
    </section>
    {page?.bodyMarkdown && <section className="season-detail wrap"><SitePageBody source={page.bodyMarkdown} format={page.bodyFormat} /></section>}
    <section className="entry-feed wrap">
      <span className="section-tag">THIS SEASON’S WORK</span>
      {cards.length ? <div className="entry-feed-grid">{cards.map(card => <Link className="entry-feed-card" href={card.href} key={card.href}><span>{card.type}</span><h2>{card.title}</h2><p>{card.summary}</p><b>Explore <ArrowUpRight size={15} /></b></Link>)}</div> : <div className="entry-feed-empty"><h2>Season work is being documented.</h2><p>Published posts, projects, and mechanisms connected to this season will appear here.</p></div>}
    </section>
    <section className="entry-feed wrap" id="robots"><span className="section-tag">ROBOTS · {season.teamName ?? "TEAM"}</span>{robots?.length ? <div className="team-profile-grid">{robots.map(robot=><article className="team-profile-card" key={robot.id}><small>{season.name} · TEAM {season.teamNumber ?? ""}</small><b>{robot.name}</b>{robot.summary&&<p>{robot.summary}</p>}</article>)}</div> : <div className="entry-feed-empty"><h2>Robot details are being prepared.</h2><p>This team’s published robots for this season will appear here.</p></div>}</section>
    {events?.length ? <section className="entry-feed wrap"><span className="section-tag">COMPETITIONS</span><div className="entry-feed-grid">{events.map(event => <article className="entry-feed-card" key={event.id}><span>{event.event_date ? new Date(`${event.event_date}T12:00:00`).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "DATE TO BE ANNOUNCED"}</span><h2>{event.name}</h2><p>{event.location}</p>{event.official_url && <a className="text-link" href={event.official_url} target="_blank" rel="noreferrer">Official event page <ArrowUpRight size={14} /></a>}</article>)}</div></section> : null}
  </main>;
}
