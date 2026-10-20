import { redirect } from "next/navigation";
import { createClient, getCmsUser } from "@/lib/supabase/server";
import { restoreTeamRevision, saveTeam } from "@/app/admin/actions";

export const metadata = { title: "Manage teams", robots: { index: false, follow: false } };

export default async function AdminTeams({ searchParams }: { searchParams: Promise<{ error?: string; code?: string; saved?: string; restored?: string }> }) {
  const user = await getCmsUser();
  if (user?.role !== "admin") redirect("/admin/login?error=access");
  const client = await createClient();
  if (!client) redirect("/admin/login?error=setup");
  const [{ data: teams, error: teamsError }, query] = await Promise.all([
    client.from("teams").select("id,slug,name,number,summary,status,sort_order").order("sort_order").order("name"), searchParams
  ]);
  const teamIds = (teams ?? []).map(team => team.id);
  const { data: revisions } = teamIds.length ? await client.from("team_revisions").select("id,team_id,created_at").in("team_id", teamIds).order("created_at", { ascending: false }).limit(100) : { data: [] };
  const errorText = query.error === "revision" ? "That team revision could not be restored." : query.error === "validation" ? "Check the team name, number, URL, and summary." : query.error === "duplicate" ? "That team number or URL is already in use." : query.error === "unchanged" ? "Supabase accepted the request but updated no team. Check the team ID and admin write policy." : query.error === "save" ? `Supabase rejected the save${query.code ? ` (database code ${query.code})` : ""}. Check the teams table, migration, and admin write policy.` : teamsError ? `Could not load teams${teamsError.code ? ` (database code ${teamsError.code})` : ""}. The team migration may be incomplete.` : query.error ? "The team change could not be completed." : "";
  return <main id="main-content" className="admin-shell"><section className="admin-dashboard">
    <div className="admin-top"><div><span className="section-tag">TEAM CMS / DIRECTORY</span><h1>Teams<span className="period">.</span></h1><p><a href="/admin">← Dashboard</a> · Each team has equal visibility and its own seasons and updates.</p></div></div>
    {query.saved && <div className="notice-success">Team saved. Public team pages have been refreshed.</div>}{query.restored && <div className="notice-success">Team version restored. The version you replaced remains in history.</div>}
    {errorText && <div role="alert" className="form-error">{errorText}</div>}
    <div className="admin-content-grid team-admin-grid">
      {teams?.map(team=><section className="admin-panel" key={team.id}><div className="panel-head"><div><span className="section-tag">TEAM {team.number} / {team.status.toUpperCase()}</span><h2>{team.name}</h2></div></div>
        <form action={saveTeam} className="entry-form"><input type="hidden" name="id" value={team.id}/>
          <label>Display name<input name="name" required maxLength={100} defaultValue={team.name}/></label>
          <label>Team number<input name="number" required inputMode="numeric" pattern="[0-9]+" defaultValue={team.number}/></label>
          <label>URL slug<input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" defaultValue={team.slug}/></label>
          <label>Team summary<textarea name="summary" rows={3} maxLength={1000} defaultValue={team.summary}/><small>Shown on the team’s public profile.</small></label>
          <label>Visibility<select name="status" defaultValue={team.status}><option value="published">Public</option><option value="draft">Draft (hidden)</option><option value="archived">Archived (hidden)</option></select></label>
          <label>Directory order<input name="sort_order" type="number" min="0" max="10000" defaultValue={team.sort_order}/></label>
          <button className="button-link" type="submit">Save team <span>→</span></button>
        </form>
        <section className="revision-panel team-revisions"><span className="section-tag">VERSION HISTORY</span><h3>Saved versions</h3>{(revisions ?? []).filter(revision=>revision.team_id===team.id).map(revision=><form action={restoreTeamRevision} key={revision.id} className="revision-row"><input type="hidden" name="teamId" value={team.id}/><input type="hidden" name="revisionId" value={revision.id}/><span>Saved version</span><time>{new Date(revision.created_at).toLocaleString()}</time><button className="text-button" type="submit">Restore</button></form>)}</section>
      </section>)}
      <section className="admin-panel"><div className="panel-head"><div><span className="section-tag">ADD TEAM</span><h2>New team</h2></div></div>
        <form action={saveTeam} className="entry-form">
          <input type="hidden" name="id" value=""/>
          <label>Display name<input name="name" required maxLength={100} placeholder="Team name"/></label>
          <label>Team number<input name="number" required inputMode="numeric" pattern="[0-9]+" placeholder="FTC number"/></label>
          <label>URL slug<input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="lowercase-team-name"/></label>
          <label>Team summary<textarea name="summary" rows={3} maxLength={1000} placeholder="A short public introduction."/></label>
          <label>Visibility<select name="status" defaultValue="published"><option value="published">Public</option><option value="draft">Draft (hidden)</option></select></label>
          <label>Directory order<input name="sort_order" type="number" min="0" max="10000" defaultValue="30"/></label>
          <button className="button-link" type="submit">Add team <span>→</span></button>
        </form>
      </section>
    </div>
    <section className="admin-panel season-manager-help"><b>Team content stays connected</b><p>Choose a team when creating a season or post. Team profiles then show only that team’s published archive and updates. Items marked shared remain on the site-wide feeds.</p></section>
  </section></main>;
}
