import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight, Atom, Bot, BookOpen, Wrench } from "lucide-react";
import { getSitePage, homeSectionsFromBody } from "@/lib/site-pages";
import SitePageBody from "@/components/SitePageBody";
import { getTeams } from "@/lib/teams";
import { getCurrentSeasons } from "@/lib/seasons";
import "./home.css";

export async function generateMetadata() {
  const page = await getSitePage("home");
  return { title: page.title, description: page.intro };
}

const highlights = [
  { title: "Robots", eyebrow: "DESIGN · BUILD · COMPETE", description: "Get to know each robot and the choices behind its design.", href: "/robot", icon: Bot, number: "01" },
  { title: "Engineering", eyebrow: "OUR PROCESS", description: "Explore how ideas become tested, working solutions.", href: "/engineering", icon: Wrench, number: "02" },
  { title: "Build journal", eyebrow: "NOTES FROM THE WORKSHOP", description: "Follow experiments, iterations, and lessons from the season.", href: "/journal", icon: BookOpen, number: "03" },
];

export default async function Home() {
  const [page, teams, currentSeasons] = await Promise.all([getSitePage("home"), getTeams(), getCurrentSeasons()]);
  const titleLines = page.title.split(" ");
  const homeSections = (page.bodyMarkdown ? homeSectionsFromBody(page.bodyMarkdown, page.bodyFormat) : page.sections)
    .filter(section => !/(who we are|current season)$/i.test(section.title));
  const sectionFormat = page.bodyMarkdown ? page.bodyFormat : "markdown";

  return <main id="main-content" className="home-page">
    <section className="home-hero wrap">
      <div className="home-hero-copy">
        <div className="hero-kicker"><span className="live-dot" />SEVEN HILLS SCHOOL <span className="home-kicker-divider">/</span> FIRST TECH CHALLENGE</div>
        <h1>{titleLines.slice(0, -1).join(" ")}<br /><span>{titleLines.at(-1)}</span><b className="period">.</b></h1>
        <p className="home-hero-lead">{page.intro}</p>
        <div className="home-hero-actions">
          <Link className="button-link" href="/teams">Meet the teams <ArrowRight size={15} /></Link>
          <Link className="home-text-link" href="/engineering">See how we work <ArrowUpRight size={15} /></Link>
        </div>
      </div>
      <div className="home-hero-art" aria-label="Seven Hills BuzzerBots and Hive Mind robotics teams">
        <div className="home-art-top"><span>SEVEN HILLS FTC</span><span>EST. 2024</span></div>
        <div className="home-art-orbit home-art-orbit-one" />
        <div className="home-art-orbit home-art-orbit-two" />
        <div className="home-art-cross home-art-cross-one" />
        <div className="home-art-cross home-art-cross-two" />
        <div className="home-art-logo"><Image src="/buzzerbots-logo.svg" alt="BuzzerBots robotics logo" fill priority sizes="(max-width: 800px) 60vw, 360px" /></div>
        <span className="home-art-code">FTC<br />23826 · 36438</span>
        <div className="home-art-bottom"><span>BUILT TOGETHER</span><span>OHIO · USA</span></div>
      </div>
      <div className="home-hero-foot">
        <Link href="#home-teams"><ArrowDown size={15} /> MEET OUR TEAMS</Link>
        <span><Atom size={14} /> TWO TEAMS · ONE COMMUNITY</span>
      </div>
    </section>

    <section className="home-intro wrap">
      <span className="section-tag">CURIOUS MINDS, HANDS-ON</span>
      <div><p>We are <b>Seven Hills FTC</b>: BuzzerBots and Hive Mind. Two independent teams sharing a community of creative problem solving, thoughtful engineering, and learning by doing.</p><Link className="home-text-link" href="/teams">Get to know us <ArrowUpRight size={15} /></Link></div>
    </section>

    <section className="home-teams" id="home-teams">
      <div className="wrap home-section-head"><div><span className="section-tag">TWO TEAMS · EQUAL FOOTING</span><h2>Meet the teams<span className="period">.</span></h2></div><p>Distinct teams. Shared curiosity.<br />Every team has its own story.</p></div>
      <div className="wrap home-team-grid">{teams.map((team, index) => {
        const season = currentSeasons.find(item => item.teamSlug === team.slug || (!!team.id && item.teamId === team.id)) ?? currentSeasons.find(item => !item.teamId && !item.teamSlug);
        const TeamIcon = index % 2 === 0 ? Bot : Atom;
        return <Link className={`home-team-card home-team-card-${index % 2 ? "second" : "first"}`} href={`/teams/${team.slug}`} key={team.slug}>
          <div className="home-team-art"><span className="home-team-index">TEAM / {String(index + 1).padStart(2, "0")}</span><TeamIcon size={90} strokeWidth={0.85} aria-hidden="true" /><span className="home-team-ring" /><span className="home-team-watermark">{team.number}</span></div>
          <div className="home-team-info"><span className="home-team-kicker">SEVEN HILLS FTC · TEAM {team.number}</span><strong>{team.name}<ArrowUpRight size={18} /></strong><p>{team.summary}</p><span className="home-team-season">{season ? `${season.name} · CURRENT SEASON` : "TEAM PROFILE · SEASON DETAILS"}</span></div>
        </Link>;
      })}</div>
    </section>

    {currentSeasons.length > 0 && <section className="home-seasons wrap"><div className="home-section-head"><div><span className="section-tag">THE SEASON, IN PROGRESS</span><h2>Current season<span className="period">.</span></h2></div><Link className="home-text-link" href="/seasons">Browse the archive <ArrowUpRight size={15} /></Link></div><div className="home-season-grid">{currentSeasons.map((season, index) => <Link className="home-season-card" href={`/seasons/${season.slug}`} key={season.slug}><span className="home-season-meta">{season.teamName ? `${season.teamName} · ${season.teamNumber}` : "SHARED SEASON"}<i>{String(index + 1).padStart(2, "0")}</i></span><span className="home-season-title">{season.name}<ArrowUpRight size={18} /></span><span className="home-season-summary">{season.summary}</span><span className="home-season-open">Explore season <ArrowRight size={14} /></span></Link>)}</div></section>}

    <section className="home-highlights">
      <div className="wrap home-section-head"><div><span className="section-tag">FROM FIRST QUESTION TO FIELD TEST</span><h2>What we’re working on<span className="period">.</span></h2></div><p>See the ideas, decisions, and iterations<br />that shape our work.</p></div>
      <div className="wrap home-highlight-grid">{highlights.map(item => { const Icon = item.icon; return <Link className="home-highlight-card" href={item.href} key={item.title}><span className="home-highlight-top"><span>{item.eyebrow}</span><span>{item.number}</span></span><span className="home-highlight-icon"><Icon size={25} strokeWidth={1.4} /></span><span className="home-highlight-title">{item.title}<ArrowUpRight size={17} /></span><span className="home-highlight-description">{item.description}</span></Link>; })}</div>
    </section>

    {homeSections.length > 0 && <section className="home-stories wrap"><div className="home-section-head"><div><span className="section-tag">THE STORY BEHIND THE ROBOTS</span><h2>More from the teams<span className="period">.</span></h2></div><Link className="home-text-link" href="/journal">Follow along <ArrowUpRight size={15} /></Link></div><div className="home-story-grid">{homeSections.map((section, index) => <article className="home-story-card" key={section.title}><span className="home-story-number">0{index + 1} / SEVEN HILLS FTC</span><h3>{section.title}</h3><SitePageBody source={section.body} format={sectionFormat} /></article>)}</div></section>}

    <section className="home-contact"><div className="wrap home-contact-inner"><div><span className="section-tag">BUILD SOMETHING WITH US</span><h2>Curious about<br />robotics<span className="period">?</span></h2><p>Come meet the teams and see what we’re making.</p></div><div className="home-contact-actions"><Link className="button-link" href="/contact">Get in touch <ArrowRight size={15} /></Link>{page.links.slice(2).map(link => <Link className="home-text-link" key={link.href} href={link.href}>{link.title} <ArrowUpRight size={15} /></Link>)}</div></div></section>
  </main>;
}
