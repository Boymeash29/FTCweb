import { redirect } from "next/navigation";
import { createClient, getCmsUser } from "@/lib/supabase/server";
import { createEntry, signOut } from "./actions";
import { collections } from "@/lib/content";
import SitePageBodyEditor from "@/components/SitePageBodyEditor";

export const metadata = { title: "CMS dashboard", robots: { index: false, follow: false } };

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string; archived?: string }> }) {
  const user = await getCmsUser();
  if (!user) {
    const client = await createClient();
    if (!client) redirect("/admin/login?error=setup");
    if (client) {
      const { data: { user: authUser } } = await client.auth.getUser();
      if (authUser) return <main className="admin-shell"><section className="admin-card"><span className="section-tag">ACCESS RESTRICTED</span><h1>Approval needed<span className="period">.</span></h1><p>This account is signed in but is not on the CMS allowlist. Ask an existing team admin to approve it.</p><form action={signOut}><button type="submit" className="text-button">Sign out</button></form></section></main>;
    }
    redirect("/admin/login?error=access");
  }

  const client = await createClient();
  if (!client) redirect("/admin/login?error=setup");
  const [{ data: entries }, { data: assets }] = await Promise.all([
    client.from("content_entries").select("id,title,slug,type,status,updated_at").order("updated_at", { ascending: false }).limit(8),
    client.from("media_assets").select("id,title,mime_type,alt_text,is_public").order("created_at", { ascending: false }).limit(100)
  ]);
  const { error, saved, archived } = await searchParams;
  const errorMessage = error === "validation" ? "Check the title, slug, and required fields." : error === "duplicate" ? "That slug is already in use." : error === "permission" ? "Editors can change drafts only. Ask an admin to edit this publication." : error === "missing" ? "This entry no longer exists." : error ? "Could not save this entry. Check the database setup and try again." : "";

  return <main id="main-content" className="admin-shell"><section className="admin-dashboard">
    <div className="admin-top"><div><span className="section-tag">TEAM CMS / OVERVIEW</span><h1>Dashboard<span className="period">.</span></h1><p>Signed in as {user.email} · <b>{user.role}</b></p><nav className="admin-nav"><a href="/admin">Content</a>{user.role === "admin" && <><a href="/admin/pages">Edit site pages</a><a href="/admin/mechanisms">Mechanisms</a><a href="/admin/users">Approved users</a></>}<a href="/admin/media">Media library</a></nav></div><form action={signOut}><button type="submit" className="text-button">Sign out</button></form></div>
    {saved && <div className="notice-success">Content entry saved.</div>}
    {archived && <div className="notice-success">Entry archived. Its history remains available to admins.</div>}
    {errorMessage && <div role="alert" className="form-error">{errorMessage}</div>}
    <div className="admin-stats">
      <div><span>CONTENT COLLECTIONS</span><b>{collections.length}</b><small>Available in the database schema</small></div>
      <div><span>RECENT ENTRIES</span><b>{entries?.length ?? 0}</b><small>Showing latest saved entries</small></div>
      <div><span>CMS ROLE</span><b className="role-label">{user.role.toUpperCase()}</b><small>Server-verified allowlist role</small></div>
    </div>
    <div className="admin-content-grid">
      <section className="admin-panel"><div className="panel-head"><div><span className="section-tag">CONTENT</span><h2>Recent entries</h2></div></div>
        {entries?.length ? <div className="entry-list">{entries.map(entry => <div className="entry-row" key={entry.id}><span className="entry-type">{entry.type}</span><b>{entry.title}</b><small>{entry.status}</small><a href={`/admin/content/${entry.id}`}>Edit ↗</a></div>)}</div> : <p className="admin-empty">Nothing here yet. Create the first draft on the right.</p>}
      </section>
      <section className="admin-panel"><div className="panel-head"><div><span className="section-tag">QUICK CREATE</span><h2>New entry</h2></div></div>
        <form action={createEntry} className="entry-form">
          <label>Title<input name="title" required minLength={3} maxLength={140} placeholder="Entry title"/></label>
          <label>URL slug<input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="short-url-name"/></label>
          <label>Content type<select name="type"><option value="news">News</option><option value="journal">Build journal</option><option value="project">Engineering project</option></select></label>
          <label>Summary<textarea name="summary" maxLength={500} rows={3} placeholder="A short description"/></label>
          <SitePageBodyEditor source="Write the entry content here." format="markdown" assets={assets ?? []} allowFormat={false}/>
          <label>State<select name="status"><option value="draft">Save as draft</option>{user.role === "admin" && <><option value="published">Publish now</option><option value="scheduled">Schedule publication</option></>}</select></label>
          {user.role === "admin" && <label>Publish at (UTC)<input type="datetime-local" name="scheduled_at"/></label>}
          <button className="button-link" type="submit">Save entry <span>→</span></button>
          <small>Editors save drafts. Admins may publish now or schedule a time. Scheduled posts publish when the configured GitHub Actions job reaches the site.</small>
        </form>
      </section>
    </div>
    <div className="admin-footnote"><b>Before launch</b><p>Add the first administrator by running the documented SQL provisioning process. Never open a public role-grant endpoint.</p><span>See README.md for setup details.</span></div>
  </section></main>;
}
