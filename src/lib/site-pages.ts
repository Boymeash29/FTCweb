import { createClient } from "@/lib/supabase/server";
import { pages } from "@/lib/content";

export type SitePageSection = { title: string; body: string };
export type SitePageLink = { title: string; href: string };
export type SitePageContent = { title: string; eyebrow: string; intro: string; sections: SitePageSection[]; links: SitePageLink[]; bodyMarkdown?: string | null; bodyFormat?: "markdown" | "html" };
export type SitePageDefinition = { key: string; path: string; label: string; fallback: SitePageContent };

const make = (key: string, path: string, label: string, eyebrow: string, title: string, intro: string, sections: SitePageSection[] = [], links: SitePageLink[] = []): SitePageDefinition => ({ key, path, label, fallback: { eyebrow, title, intro, sections, links } });
const empty = (title: string): SitePageSection[] => [{ title: "About this page", body: `Add the approved ${title.toLowerCase()} information here.` }];

export const sitePageDefinitions: SitePageDefinition[] = [
  make("home", "/", "Home", "Seven Hills School · First Tech Challenge", "Built to figure it out", "Curious minds. Thoughtful engineering. One season at a time.", [
    { title: "Who we are", body: "We’re the BuzzerBots, Seven Hills FTC Team 23826, turning questions into things that move. This is where we share the decisions, experiments, code, and lessons behind our work." },
    { title: "Current season", body: "As designs are tested and decisions are made, the robot’s story will take shape here. We document the process, not just the finished product." },
    { title: "The work", body: "Follow the work from first question to field test." },
    { title: "Season archive", body: "Our archive keeps each season’s work in its own place, so what we learn stays findable." },
    { title: "Follow along", body: "Explore the portfolio, follow our build log, or get in touch through an approved public channel." }
  ], [{ title: "Robot overview", href: "/robot" }, { title: "Engineering portfolio", href: "/engineering" }, { title: "Contact the team", href: "/contact" }]),
  ...Object.entries(pages).filter(([key]) => !["robot", "engineering", "software", "competitions", "journal", "news"].includes(key)).map(([key, value]) => make(key, `/${key}`, value.title, value.eyebrow, value.title, value.intro, value.sections)),
  make("robot", "/robot", "Robot", "Current season · BioBuzz", "The robot", "A navigable overview of the machine, its mechanisms, and the engineering decisions behind it.", [{ title: "Robot overview", body: "Robot details have not yet been supplied by the team. Add the purpose, constraints, and design summary once they are verified." }, { title: "Architecture", body: "The mechanical, electrical, and software architecture can be documented here as approved design materials arrive." }, { title: "Build history", body: "Connect iterations, tests, and lessons learned through the engineering journal." }], [{ title: "Mechanisms", href: "/mechanisms" }, { title: "Software documentation", href: "/software" }, { title: "Engineering journal", href: "/journal" }, { title: "Season archive", href: "/seasons/biobuzz" }]),
  make("engineering", "/engineering", "Engineering", "Design · Build · Test · Learn", "Engineering portfolio", "A judge-friendly guide to our engineering process, with paths into technical evidence for each decision.", [{ title: "Our process", body: "Requirements, concepts, trade studies, implementation, testing, and iteration belong here. Team-specific process documentation is awaiting submission." }, { title: "Hardware", body: "Mechanism documentation is organized by purpose, requirements, design rationale, iterations, and test evidence." }, { title: "Software", body: "Architecture, subsystems, autonomous routines, controls, and debugging notes can be documented without assuming any particular technology." }], [{ title: "Current robot", href: "/robot" }, { title: "Mechanisms", href: "/mechanisms" }, { title: "Software documentation", href: "/software" }, { title: "Engineering projects", href: "/projects" }, { title: "Season archive", href: "/seasons" }]),
  make("software", "/software", "Software", "Engineering · Software", "Software", "A place for the architecture, control logic, testing notes, and code decisions behind the robot.", [{ title: "Architecture", body: "System diagrams, subsystem boundaries, and design choices will be documented when team materials are available." }, { title: "Autonomous & control", body: "Document routines, state machines, sensor use, and control methods only when confirmed for the team's robot." }, { title: "Code & testing", body: "Selected code excerpts, repository links, test strategy, debugging notes, and lessons learned belong here. Never publish private credentials." }]),
  make("competitions", "/competitions", "Competitions", "Season · Events", "Competitions", "Schedules, event details, and results will be published here when confirmed.", [{ title: "Upcoming events", body: "No event schedule has been supplied. Upcoming and completed events will be clearly distinguished once entered." }, { title: "Results & awards", body: "Only verified rankings and awards will be published, with links to official FIRST event pages where available." }]),
  make("journal", "/journal", "Build journal", "Engineering journal", "Build journal", "Experiments, iterations, and lessons learned along the way.", empty("Build journal")),
  make("news", "/news", "News", "Team updates", "News", "Announcements, competition updates, and milestones from the team.", empty("News")),
  make("projects", "/projects", "Projects", "Engineering portfolio", "Projects", "Focused engineering efforts, their design choices, and the evidence behind the result.", empty("Projects")),
  make("mechanisms", "/mechanisms", "Mechanisms", "Hardware engineering", "Mechanisms", "Each mechanism has its own requirements, design rationale, iterations, and test evidence.", empty("Mechanisms")),
  make("search", "/search", "Search", "Site search", "Find the work", "Search published team documentation and explore the archive."),
  make("seasons", "/seasons", "Seasons", "The archive", "Season by season", "Every season has its own robot, questions, tests, and lessons. The archive keeps that work connected without overwriting what came before.", [{ title: "Historical seasons", body: "Older season records will be added as the team supplies verified information and documentation." }]),
  make("season-biobuzz", "/seasons/biobuzz", "BioBuzz season", "Season archive · Current", "BioBuzz", "The current season for Seven Hills FTC Team 23826. Robot details, events, results, and engineering documentation will be added when verified by the team.", [{ title: "Season content", body: "Explore the robot, engineering portfolio, software, journal, competitions, and outreach documentation." }]),
  make("accessibility", "/accessibility", "Accessibility", pages.accessibility.eyebrow, pages.accessibility.title, pages.accessibility.intro, pages.accessibility.sections),
  make("contact", "/contact", "Contact", pages.contact.eyebrow, pages.contact.title, pages.contact.intro, pages.contact.sections),
  make("outreach", "/outreach", "Outreach", pages.outreach.eyebrow, pages.outreach.title, pages.outreach.intro, pages.outreach.sections),
  make("privacy", "/privacy", "Privacy notice", pages.privacy.eyebrow, pages.privacy.title, pages.privacy.intro, pages.privacy.sections),
  make("sponsors", "/sponsors", "Sponsors", pages.sponsors.eyebrow, pages.sponsors.title, pages.sponsors.intro, pages.sponsors.sections),
  make("team", "/team", "Team", pages.team.eyebrow, pages.team.title, pages.team.intro, pages.team.sections)
];

export function getSitePageDefinition(key: string) { return sitePageDefinitions.find(page => page.key === key); }

export function pageContentAsMarkdown(page: Pick<SitePageContent, "sections" | "links">) {
  const sections=page.sections.map(section=>`## ${section.title}\n\n${section.body}`).join("\n\n");
  const links=page.links.length?`\n\n## Explore more\n\n${page.links.map(link=>`- [${link.title}](${link.href})`).join("\n")}`:"";
  return `${sections}${links}`.trim();
}

export function contentBlocksAsMarkdown(value: unknown) {
  if(!Array.isArray(value))return "";
  return value.map((block:Record<string,unknown>)=>{
    const text=typeof block.text==="string"?block.text:"";
    if(block.type==="heading")return `## ${text}`;
    if(block.type==="paragraph")return text;
    if(block.type==="list"&&Array.isArray(block.items))return block.items.map(item=>`- ${String(item)}`).join("\n");
    if(block.type==="quote")return `> ${text}${typeof block.attribution==="string"?` — ${block.attribution}`:""}`;
    if(block.type==="code")return `\`\`\`${typeof block.language==="string"?block.language:""}\n${typeof block.code==="string"?block.code:""}\n\`\`\``;
    if(block.type==="link"&&typeof block.label==="string"&&typeof block.href==="string")return `[${block.label}](${block.href})`;
    return "";
  }).filter(Boolean).join("\n\n");
}

export async function getSitePage(key: string): Promise<SitePageContent> {
  const definition = getSitePageDefinition(key);
  if (!definition) throw new Error(`Unknown site page: ${key}`);
  const client = await createClient();
  if (!client) return definition.fallback;
  const { data } = await client.from("site_pages").select("title,eyebrow,intro,sections,links,body_markdown,body_format,status").eq("page_key", key).eq("status", "published").maybeSingle();
  if (!data) return definition.fallback;
  return { title: data.title, eyebrow: data.eyebrow, intro: data.intro, sections: data.sections as SitePageSection[], links: data.links as SitePageLink[], bodyMarkdown: data.body_markdown, bodyFormat: data.body_format ?? "markdown" };
}
