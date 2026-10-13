import EntryFeed from "@/components/EntryFeed";
import SitePageHeading from "@/components/SitePageHeading";
import { getSitePage } from "@/lib/site-pages";
export async function generateMetadata(){const page=await getSitePage("news");return {title:page.title,description:page.intro};}
export default function NewsPage(){return <main id="main-content"><SitePageHeading pageKey="news"/><EntryFeed type="news" title="News"/></main>;}
