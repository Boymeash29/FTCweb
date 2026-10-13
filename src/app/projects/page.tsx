import EntryFeed from "@/components/EntryFeed";
import SitePageHeading from "@/components/SitePageHeading";
import { getSitePage } from "@/lib/site-pages";
export async function generateMetadata(){const page=await getSitePage("projects");return {title:page.title,description:page.intro};}
export default function ProjectsPage(){return <main id="main-content"><SitePageHeading pageKey="projects"/><EntryFeed type="project" title="Engineering projects"/></main>;}
