import { notFound, redirect } from "next/navigation";
import { createClient, getCmsUser } from "@/lib/supabase/server";
import { getSitePageDefinition } from "@/lib/site-pages";
import { pageContentAsMarkdown } from "@/lib/site-pages";
import { restoreSitePageRevision, saveSitePage } from "@/app/admin/actions";
import SitePageBodyEditor from "@/components/SitePageBodyEditor";

export const metadata = { title: "Edit site page", robots: { index: false, follow: false } };

export default async function EditSitePage({ params, searchParams }: { params: Promise<{ key: string }>; searchParams: Promise<{ saved?: string; restored?: string; error?: string }> }) {
  const user = await getCmsUser();
  if (user?.role !== "admin") redirect("/admin/login?error=access");
  const { key } = await params;
  const definition = getSitePageDefinition(key);
  if (!definition) notFound();
  const client = await createClient();
  if (!client) redirect("/admin/login?error=setup");
  const [{ data }, { data: assets }, { data: revisions }] = await Promise.all([
    client.from("site_pages").select("title,eyebrow,intro,sections,links,body_markdown,body_format").eq("page_key", key).maybeSingle(),
    client.from("media_assets").select("id,title,mime_type,alt_text,is_public").order("created_at", { ascending: false }).limit(100),
    client.from("site_page_revisions").select("id,created_at,author_id").eq("page_key", key).order("created_at", { ascending: false }).limit(30)
  ]);
  const page = data ?? definition.fallback;
  const markdown = data?.body_markdown ?? pageContentAsMarkdown(page);
  const { saved, restored, error } = await searchParams;
  return <main id="main-content" className="admin-shell"><section className="admin-dashboard admin-editor">
    <div className="admin-top"><div><span className="section-tag">SITE PAGES / EDIT</span><h1>{definition.label}<span className="period">.</span></h1><p><a href="/admin/pages">← All pages</a> · <a href={definition.path}>View page ↗</a></p></div></div>
    {saved && <div className="notice-success">Page saved and published.</div>}{restored && <div className="notice-success">Earlier version restored. The version you replaced remains in history.</div>}{error && <div role="alert" className="form-error">{error === "validation" ? "Review the page fields and JSON formatting." : error === "history" ? "The page was saved, but its starting version could not be added to history." : error === "revision" ? "That saved version could not be restored." : "The page could not be saved. Check the database connection and try again."}</div>}
    <form action={saveSitePage} className="entry-form editor-form">
      <input type="hidden" name="key" value={key}/>
      <label>Page title<input name="title" required maxLength={140} defaultValue={page.title}/></label>
      <label>Eyebrow / overline<input name="eyebrow" maxLength={120} defaultValue={page.eyebrow}/></label>
      <label>Introduction<textarea name="intro" rows={4} maxLength={2000} defaultValue={page.intro}/></label>
      <SitePageBodyEditor source={markdown} format={data?.body_format === "html" ? "html" : "markdown"} assets={assets ?? []} helpId="page-source-help" showSectionIndex/>
      <small id="page-source-help">Use a separate <code>## Heading</code> for every section. The live preview shows how the page will look and which headings appear in “In this section.” HTML is sanitized; unsafe content is removed.</small>
      <button className="button-link" type="submit">Save and publish page <span>→</span></button>
    </form>
    <section className="admin-panel revision-panel"><span className="section-tag">VERSION HISTORY</span><h2>Saved versions</h2><p className="admin-empty">Each save keeps the previous page version. Restoring one adds the current version to history first.</p>{revisions?.length ? revisions.map(revision=><form action={restoreSitePageRevision} key={revision.id} className="revision-row"><input type="hidden" name="key" value={key}/><input type="hidden" name="revisionId" value={revision.id}/><span>Saved version</span><time>{new Date(revision.created_at).toLocaleString()}</time><button className="text-button" type="submit">Restore</button></form>) : <p className="admin-empty">Your starting version will be kept when you save this page for the first time.</p>}</section>
  </section></main>;
}
