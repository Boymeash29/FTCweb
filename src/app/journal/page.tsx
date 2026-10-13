import EntryFeed from "@/components/EntryFeed";
import SitePageHeading from "@/components/SitePageHeading";
import { getSitePage } from "@/lib/site-pages";
export async function generateMetadata(){const page=await getSitePage("journal");return {title:page.title,description:page.intro};}
export default function JournalPage(){return <main id="main-content"><SitePageHeading pageKey="journal"/><EntryFeed type="journal" title="Journal"/></main>;}
