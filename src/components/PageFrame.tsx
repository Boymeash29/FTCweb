import Link from "next/link";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import MarkdownContent from "@/components/MarkdownContent";
import { getMarkdownHeadings } from "@/lib/markdown-headings";
import { getSitePage, pageContentAsMarkdown } from "@/lib/site-pages";

export default async function PageFrame({ pageKey }: { pageKey: string }) {
  const page = await getSitePage(pageKey);
  const { eyebrow, title, intro, sections, links } = page;
  const markdown = page.bodyMarkdown ?? pageContentAsMarkdown(page);
  const markdownSections = page.bodyMarkdown
    ? getMarkdownHeadings(markdown).filter(heading => heading.level === 2 && heading.title.toLocaleLowerCase() !== "explore more")
    : [];

  return (
    <main>
      <section className="page-intro wrap">
        <div className="eyebrow"><span className="eyebrow-line" />{eyebrow}</div>
        <h1>{title}<span className="period">.</span></h1>
        <p className="lead">{intro}</p>
      </section>

      {page.bodyMarkdown ? (
        <section className="page-body wrap">
          {markdownSections.length > 0 && (
            <nav className="section-index" aria-label="In this section">
              <span>IN THIS SECTION</span>
              {markdownSections.map((section, index) => (
                <a key={section.id} href={`#${section.id}`}>
                  <span>{String(index + 1).padStart(2, "0")}</span>{section.title}
                </a>
              ))}
            </nav>
          )}
          <div className={markdownSections.length > 0 ? "page-content" : "page-content page-content-full"}>
            <MarkdownContent source={markdown} />
          </div>
        </section>
      ) : (
        <section className="page-body wrap">
          <nav className="section-index" aria-label="In this section">
            <span>IN THIS SECTION</span>
            {sections.map((section, index) => (
              <a key={section.title} href={`#section-${index}`}>
                <span>{String(index + 1).padStart(2, "0")}</span>{section.title}
              </a>
            ))}
            {links.length > 0 && (
              <Link href={links[0].href} className="index-link">
                Explore more <ArrowDownRight size={15} />
              </Link>
            )}
          </nav>
          <div className="page-content">
            {sections.map((section, index) => (
              <article id={`section-${index}`} key={section.title} className="content-block">
                <div className="block-number">{String(index + 1).padStart(2, "0")}</div>
                <div><h2>{section.title}</h2><p>{section.body}</p></div>
              </article>
            ))}
            {links.length > 0 && (
              <div className="link-grid">
                {links.map(link => (
                  <Link key={link.href} href={link.href} className="feature-link">
                    <span>{link.title}</span><ArrowUpRight size={17} />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
