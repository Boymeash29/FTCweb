import { redirect } from "next/navigation";
import { createClient, getCmsUser } from "@/lib/supabase/server";
import { saveSeason } from "./actions";

export const metadata = { title: "Manage seasons", robots: { index: false, follow: false } };

export default async function AdminSeasons({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const user = await getCmsUser();
  if (user?.role !== "admin") redirect("/admin/login?error=access");
  const client = await createClient();
  if (!client) redirect("/admin/login?error=setup");
  const [{ data: seasons }, { error, saved }] = await Promise.all([
    client.from("seasons").select("id,name,slug,year_label,start_date,end_date,summary,is_current,status").order("start_date", { ascending: false, nullsFirst: false }),
    searchParams
  ]);
  const errorText = error === "validation" ? "Check the season name, URL, and date range." : error === "duplicate" ? "That URL is already used by another season." : error ? "Could not save the season. Confirm the database migration is installed and try again." : "";

  return <main id="main-content" className="admin-shell"><section className="admin-dashboard">
    <div className="admin-top"><div><span className="section-tag">TEAM CMS / SEASONS</span><h1>Seasons<span className="period">.</span></h1><p><a href="/admin">← Dashboard</a> · Create a new season or add a past season to the archive.</p></div></div>
    {saved && <div className="notice-success">Season saved.</div>}
    {errorText && <div role="alert" className="form-error">{errorText}</div>}
    <section className="admin-panel season-manager-help"><b>How seasons work</b><p>Only published seasons appear on the public site. Mark one season as current to move the “Current” label to it; the previous one stays in the archive. Archive old records instead of deleting them.</p></section>
    <div className="admin-content-grid season-manager-grid">
      <section className="admin-panel"><div className="panel-head"><div><span className="section-tag">SEASON ARCHIVE</span><h2>Saved seasons</h2></div></div>
        {seasons?.length ? <div className="entry-list">{seasons.map(season=><div className="entry-row season-admin-row" key={season.id}><span className="entry-type">{season.is_current ? "CURRENT" : season.status.toUpperCase()}</span><b>{season.name}</b><small>{season.year_label || season.start_date?.slice(0,4) || "No year"}</small><a href={`/admin/seasons/${season.id}`}>Edit ↗</a></div>)}</div> : <p className="admin-empty">No seasons found. Use the form to create one.</p>}
      </section>
      <section className="admin-panel"><div className="panel-head"><div><span className="section-tag">QUICK CREATE</span><h2>Add a season</h2></div></div>
        <form action={saveSeason} className="entry-form season-form">
          <input type="hidden" name="id" value="" />
          <label>Season name<input name="name" required maxLength={120} placeholder="e.g. BioBuzz"/></label>
          <label>URL slug<input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="e.g. biobuzz"/><small>Lowercase letters, numbers, and hyphens.</small></label>
          <label>Year label<input name="year_label" maxLength={40} placeholder="e.g. 2026–27"/></label>
          <label>Short description<textarea name="summary" rows={3} maxLength={2000} placeholder="A short season introduction for the public archive."/></label>
          <div className="season-date-fields"><label>Start date<input type="date" name="start_date"/></label><label>End date<input type="date" name="end_date"/></label></div>
          <label>Visibility<select name="status" defaultValue="draft"><option value="draft">Draft (hidden)</option><option value="published">Published on website</option><option value="archived">Archived (hidden)</option></select></label>
          <label className="checkbox-label"><input type="checkbox" name="is_current" value="true"/> Set as current season</label>
          <button className="button-link" type="submit">Create season <span>→</span></button>
        </form>
      </section>
    </div>
  </section></main>;
}
