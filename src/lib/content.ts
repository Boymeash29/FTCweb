export type ContentStatus = "draft" | "scheduled" | "published" | "archived";
export type Season = { id?: string; name: string; slug: string; year: string; summary: string; current: boolean; startDate?: string | null; endDate?: string | null; status?: "draft" | "published" | "archived"; teamId?: string; teamName?: string; teamNumber?: string; teamSlug?: string };

export const currentSeason: Season = {
  name: "BioBuzz", slug: "biobuzz", year: "Current", current: true,
  summary: "The current season for Seven Hills FTC Team 23826. Robot details, events, results, and engineering documentation will be added when verified by the team.", teamName: "BuzzerBots", teamNumber: "23826", teamSlug: "buzzerbots"
};

export const navigation = [
  { label: "Teams", href: "/teams" },
  { label: "Robot", href: "/robot" },
  { label: "Engineering", href: "/engineering" },
  { label: "Seasons", href: "/seasons" },
  { label: "Journal", href: "/journal" }
];

export const collections = ["seasons", "robots", "mechanisms", "projects", "software", "members", "competitions", "sponsors", "outreach", "journal", "news", "media"] as const;

export const pages: Record<string, { eyebrow: string; title: string; intro: string; sections: { title: string; body: string }[] }> = {
  robot: { eyebrow: "Robot teams · Season archives", title: "The robots", intro: "A focused overview of the machine, its design goals, and the engineering decisions behind it.", sections: [
    { title: "Robot overview", body: "Robot details have not yet been supplied by the team. This space is ready for the robot's purpose, constraints, and design summary." },
    { title: "Architecture", body: "Document the mechanical, electrical, and software architecture here as designs are confirmed." },
    { title: "Build history", body: "The build log will connect iterations, tests, and lessons learned to this season's robot." }
  ] },
  engineering: { eyebrow: "Design · Build · Test · Learn", title: "Engineering portfolio", intro: "A judge-friendly guide to our engineering process, with paths into the technical evidence behind each decision.", sections: [
    { title: "Our process", body: "Requirements, concepts, trade studies, implementation, testing, and iteration belong here. Team-specific process documentation is awaiting submission." },
    { title: "Hardware", body: "Mechanism documentation is organized by purpose, requirements, design rationale, iterations, and test evidence." },
    { title: "Software", body: "Architecture, subsystems, autonomous routines, controls, and debugging notes can be documented without assuming any particular technology." }
  ] },
  team: { eyebrow: "The people behind the work", title: "The teams", intro: "BuzzerBots 23826 and Hive Mind 36438 are two distinct Seven Hills FTC teams, each bringing students together to design, build, program, compete, and share their work.", sections: [
    { title: "Students", body: "Approved member names and roles will be added here. Student information and photographs require team approval." },
    { title: "Mentors", body: "Faculty mentors and coaches will be listed when the team provides approved names and roles." }
  ] },
  sponsors: { eyebrow: "Support", title: "Sponsors", intro: "Organizations that support the Seven Hills FTC teams.", sections: [
    { title: "Partner with a team", body: "Sponsor names and logos will appear under the team and season they support after support and logo usage have been confirmed." }
  ] },
  outreach: { eyebrow: "Community", title: "Outreach", intro: "Events, learning, and connections beyond the workshop.", sections: [
    { title: "Our community work", body: "Approved outreach events, photographs, and verified outcomes will be documented here." }
  ] },
  journal: { eyebrow: "In progress", title: "Build journal", intro: "Engineering is a sequence of experiments. The journal records the iterations, including what did not work.", sections: [
    { title: "Entries are coming", body: "No build-log entries have been supplied yet. Once available, entries will be organized by date and season." }
  ] },
  news: { eyebrow: "Team updates", title: "News", intro: "Announcements and milestones from Seven Hills FTC.", sections: [
    { title: "No announcements yet", body: "Approved team news will appear here." }
  ] },
  contact: { eyebrow: "Get in touch", title: "Contact", intro: "For team inquiries, please use the official public contact channel once it has been approved.", sections: [
    { title: "Public contact", body: "Administrative placeholder: the team has not supplied public contact details. No personal student contact information is published here." },
    { title: "Social media", body: "Official team social links will be added after they are confirmed." }
  ] },
  privacy: { eyebrow: "Site information", title: "Privacy notice", intro: "This site is designed to share team-approved work while protecting students' privacy.", sections: [
    { title: "Information we publish", body: "Names, roles, photographs, and contact information should be published only with appropriate team and school approval. The site does not include a contact form." },
    { title: "Authentication and analytics", body: "The CMS uses email and password sign-in for approved editors. Analytics are not configured. If analytics are added, the provider and data practices must be disclosed here." }
  ] },
  accessibility: { eyebrow: "Site information", title: "Accessibility", intro: "We aim to make the site usable with a keyboard, screen reader, and a range of devices and motion preferences.", sections: [
    { title: "Our approach", body: "The interface uses semantic HTML, visible focus styles, responsive layouts, and reduced-motion support. A complete manual accessibility review is still needed before launch." },
    { title: "Feedback", body: "An approved public contact channel will be added here when supplied by the team." }
  ] }
};

export const seasons: Season[] = [currentSeason];

const publicSections = [
  { title: "The robot", href: "/robot", type: "Robot", text: "Robot overview mechanisms architecture" },
  { title: "Engineering portfolio", href: "/engineering", type: "Engineering", text: "Design requirements CAD testing iterations" },
  { title: "Seasons archive", href: "/seasons", type: "Seasons", text: "BioBuzz current season historical archive BuzzerBots Hive Mind team seasons" },
  { title: "Build journal", href: "/journal", type: "Journal", text: "Build log experiments progress" },
  { title: "Software", href: "/software", type: "Software", text: "Programming controls code" },
  { title: "Seven Hills FTC teams", href: "/teams", type: "Teams", text: "BuzzerBots 23826 Hive Mind 36438" },
  { title: "BuzzerBots · Team 23826", href: "/teams/buzzerbots", type: "Team", text: "Seven Hills BuzzerBots" },
  { title: "BuzzerBots robot archive", href: "/teams/buzzerbots/robot", type: "Robot", text: "Team 23826 robots" },
  { title: "BuzzerBots engineering portfolio", href: "/teams/buzzerbots/engineering", type: "Engineering", text: "Team 23826 projects mechanisms software" },
  { title: "Hive Mind · Team 36438", href: "/teams/hive-mind", type: "Team", text: "Seven Hills Hive Mind" },
  { title: "Hive Mind robot archive", href: "/teams/hive-mind/robot", type: "Robot", text: "Team 36438 robots" },
  { title: "Hive Mind engineering portfolio", href: "/teams/hive-mind/engineering", type: "Engineering", text: "Team 36438 projects mechanisms software" }
];

export function searchPublicSections(query: string) {
  const term = query.trim().toLocaleLowerCase();
  if (!term) return [];
  return publicSections.filter(section => `${section.title} ${section.type} ${section.text}`.toLocaleLowerCase().includes(term));
}
