import { getSitePage } from "@/lib/site-pages";
import SitePageBody from "@/components/SitePageBody";
import { getMarkdownHeadings } from "@/lib/markdown-headings";
import { getHtmlHeadings } from "@/components/SafeHtmlContent";

export default async function SitePageHeading({ pageKey }: { pageKey: string }) {
  const page = await getSitePage(pageKey);
  const headings = !page.bodyMarkdown ? [] : page.bodyFormat === "html"
    ? getHtmlHeadings(page.bodyMarkdown)
    : getMarkdownHeadings(page.bodyMarkdown).filter(heading => heading.level === 2 && heading.title.toLocaleLowerCase() !== "explore more");
  return <><section className="page-intro wrap"><div className="eyebrow"><span className="eyebrow-line"/>{page.eyebrow}</div><h1>{page.title}<span className="period">.</span></h1><p className="lead">{page.intro}</p></section>{page.bodyMarkdown&&<section className="page-body wrap">{headings.length>0&&<nav className="section-index" aria-label="In this section"><span>IN THIS SECTION</span>{headings.map((heading,index)=><a key={String(heading.id)} href={`#${heading.id}`}><span>{String(index+1).padStart(2,"0")}</span>{heading.title}</a>)}</nav>}<div className={headings.length>0?"page-content":"page-content page-content-full"}><SitePageBody source={page.bodyMarkdown} format={page.bodyFormat}/></div></section>}</>;
}
