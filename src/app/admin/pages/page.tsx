import { redirect } from "next/navigation";
import { createClient, getCmsUser } from "@/lib/supabase/server";
import { sitePageDefinitions } from "@/lib/site-pages";

export const metadata = { title: "Edit site pages", robots: { index: false, follow: false } };

export default async function SitePagesAdmin({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await getCmsUser();
  if (user?.role !== "admin") redirect("/admin/login?error=access");
  const client = await createClient();
  if (!client) redirect("/admin/login?error=setup");
  const { data } = await client.from("site_pages").select("page_key,title,updated_at");
  const saved = new Map((data ?? []).map(page => [page.page_key, page]));
  const { error } = await searchParams;
  return <main id="main-content" className="admin-shell"><section className="admin-dashboard">
    <div className="admin-top"><div><span className="section-tag">TEAM CMS / SITE PAGES</span><h1>Every page<span className="period">.</span></h1><p>Manage the copy and page sections across the public site. Saving publishes the update and preserves the previous version.</p><nav className="admin-nav"><a href="/admin">Content</a><a href="/admin/pages">Pages</a><a href="/admin/mechanisms">Mechanisms</a><a href="/admin/users">Approved users</a><a href="/admin/media">Media library</a></nav></div></div>
    {error && <div role="alert" className="form-error">Could not load pages. Check the local database migration and try again.</div>}
    <section className="admin-panel"><div className="panel-head"><div><span className="section-tag">PUBLIC SITE</span><h2>Pages you can edit</h2></div></div><div className="entry-list">{sitePageDefinitions.map(page => { const record=saved.get(page.key);return <div className="entry-row" key={page.key}><span className="entry-type">{record?"CUSTOMIZED":"DEFAULT"}</span><b>{record?.title ?? page.label}</b><small>{page.path}</small><a href={`/admin/pages/${page.key}`}>Edit ↗</a></div>; })}</div></section>
    <div className="admin-footnote"><b>Dynamic content</b><p>News, journal entries, and projects are edited from Content. Mechanism details are edited under Mechanisms. Each individual article page follows its saved entry.</p></div>
  </section></main>;
}
