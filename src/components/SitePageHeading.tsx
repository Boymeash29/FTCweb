import { getSitePage } from "@/lib/site-pages";
import MarkdownContent from "@/components/MarkdownContent";

export default async function SitePageHeading({ pageKey }: { pageKey: string }) {
  const page = await getSitePage(pageKey);
  return <><section className="page-intro wrap"><div className="eyebrow"><span className="eyebrow-line"/>{page.eyebrow}</div><h1>{page.title}<span className="period">.</span></h1><p className="lead">{page.intro}</p></section>{page.bodyMarkdown&&<section className="wrap"><MarkdownContent source={page.bodyMarkdown}/></section>}</>;
}
