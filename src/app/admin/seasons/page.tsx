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
    client.from("seasons").select("id,name,slug,year_label,start_date,end_date,summary,is_current,status,team_id").order("start_date", { ascending: false, nullsFirst: false }),
    searchParams
  ]);
  const { data: teams } = await client.from("teams").select("id,name,number").order("sort_order");
  const errorText = error === "validation" ? "Check the season name, URL, and date range." : error === "duplicate" ? "That URL is already used by another season." : error === "migration" ? "The team-aware season save function is missing from Supabase. Run supabase/repair-season-save-rpc.sql in the SQL Editor, then retry." : error ? "Could not save the season. Check the Supabase database configuration and try again." : "";

  return <main id="main-content" className="admin-shell"><section className="admin-dashboard">
    <div className="admin-top"><div><span className="section-tag">TEAM CMS / SEASONS</span><h1>Seasons<span className="period">.</span></h1><p><a href="/admin">← Dashboard</a> · Create a new season or add a past season to the archive.</p></div></div>
    {saved && <div className="notice-success">Season saved.</div>}
    {errorText && <div role="alert" className="form-error">{errorText}</div>}
    <section className="admin-panel season-manager-help"><b>How seasons work</b><p>Published seasons belong to one team and appear in that team’s archive. Each team can have one current season; the other team’s current season is unaffected. Archive old records instead of deleting them.</p></section>
    <div className="admin-content-grid season-manager-grid">
      <section className="admin-panel"><div className="panel-head"><div><span className="section-tag">SEASON ARCHIVE</span><h2>Saved seasons</h2></div></div>
        {seasons?.length ? <div className="entry-list">{seasons.map(season=><div className="entry-row season-admin-row" key={season.id}><span className="entry-type">{season.is_current ? "CURRENT" : season.status.toUpperCase()}</span><b>{season.name}</b><small>{teams?.find(team=>team.id===season.team_id)?.name || "Shared"} · {season.year_label || season.start_date?.slice(0,4) || "No year"}</small><a href={`/admin/seasons/${season.id}`}>Edit ↗</a></div>)}</div> : <p className="admin-empty">No seasons found. Use the form to create one.</p>}
      </section>
      <section className="admin-panel"><div className="panel-head"><div><span className="section-tag">QUICK CREATE</span><h2>Add a season</h2></div></div>
        <form action={saveSeason} className="entry-form season-form">
          <input type="hidden" name="id" value="" />
          <label>Team<select name="team_id" defaultValue=""><option value="">Shared / not assigned</option>{teams?.map(team=><option key={team.id} value={team.id}>{team.name} · {team.number}</option>)}</select></label>
          <label>Season name<input name="name" required maxLength={120} placeholder="e.g. Into the Deep"/></label>
          <label>URL slug (optional)<input name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="Auto-generated from name and year"/><small>Leave this empty for an automatic URL, or enter lowercase letters, numbers, and hyphens.</small></label>
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
