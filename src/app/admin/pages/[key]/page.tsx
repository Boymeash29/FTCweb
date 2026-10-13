import { notFound, redirect } from "next/navigation";
import { createClient, getCmsUser } from "@/lib/supabase/server";
import { getSitePageDefinition } from "@/lib/site-pages";
import { pageContentAsMarkdown } from "@/lib/site-pages";
import { saveSitePage } from "@/app/admin/actions";

export const metadata = { title: "Edit site page", robots: { index: false, follow: false } };

export default async function EditSitePage({ params, searchParams }: { params: Promise<{ key: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const user = await getCmsUser();
  if (user?.role !== "admin") redirect("/admin/login?error=access");
  const { key } = await params;
  const definition = getSitePageDefinition(key);
  if (!definition) notFound();
  const client = await createClient();
  if (!client) redirect("/admin/login?error=setup");
  const { data } = await client.from("site_pages").select("title,eyebrow,intro,sections,links,body_markdown").eq("page_key", key).maybeSingle();
  const page = data ?? definition.fallback;
  const markdown = data?.body_markdown ?? pageContentAsMarkdown(page);
  const { saved, error } = await searchParams;
  return <main id="main-content" className="admin-shell"><section className="admin-dashboard admin-editor">
    <div className="admin-top"><div><span className="section-tag">SITE PAGES / EDIT</span><h1>{definition.label}<span className="period">.</span></h1><p><a href="/admin/pages">← All pages</a> · <a href={definition.path}>View page ↗</a></p></div></div>
    {saved && <div className="notice-success">Page saved and published.</div>}{error && <div role="alert" className="form-error">{error === "validation" ? "Review the page fields and JSON formatting." : "The page could not be saved. Check the database connection and try again."}</div>}
    <form action={saveSitePage} className="entry-form editor-form">
      <input type="hidden" name="key" value={key}/>
      <label>Page title<input name="title" required maxLength={140} defaultValue={page.title}/></label>
      <label>Eyebrow / overline<input name="eyebrow" maxLength={120} defaultValue={page.eyebrow}/></label>
      <label>Introduction<textarea name="intro" rows={4} maxLength={2000} defaultValue={page.intro}/></label>
      <label>Page body (Markdown)<textarea name="body_markdown" rows={24} maxLength={100000} defaultValue={markdown} aria-describedby="markdown-help" spellCheck="false"/></label>
      <small id="markdown-help">Use a level-two heading (<code>## Group name</code>) for each group; these headings appear in the page’s “In this section” navigation. Markdown also supports paragraphs, bold, italics, lists, quotes, code fences, and HTTPS or same-site links. HTML is displayed as text and never executed.</small>
      <button className="button-link" type="submit">Save and publish page <span>→</span></button>
    </form>
  </section></main>;
}
