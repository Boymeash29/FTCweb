import SearchBox from "@/components/SearchBox";
import SitePageHeading from "@/components/SitePageHeading";
import { getSitePage } from "@/lib/site-pages";
export async function generateMetadata(){const page=await getSitePage("search");return {title:page.title,description:page.intro};}
export default function SearchPage(){return <main id="main-content"><SitePageHeading pageKey="search"/><section className="wrap"><SearchBox/></section></main>;}
