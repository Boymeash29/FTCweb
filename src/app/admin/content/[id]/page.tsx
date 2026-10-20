import { notFound, redirect } from "next/navigation";
import { createClient, getCmsUser } from "@/lib/supabase/server";
import { archiveEntry, restoreRevision, updateEntry } from "@/app/admin/actions";
import { contentBlocksAsMarkdown } from "@/lib/site-pages";
import SitePageBodyEditor from "@/components/SitePageBodyEditor";

export const metadata = { title: "Edit content", robots: { index: false, follow: false } };

export default async function EditEntryPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; restored?: string }> }) {
  const user = await getCmsUser();
  if (!user) redirect("/admin/login?error=access");
  const { id } = await params;
  const client = await createClient();
  if (!client) redirect("/admin/login?error=setup");
  const [{ data: entry }, { data: assets }] = await Promise.all([
    client.from("content_entries").select("id,title,slug,type,team_id,summary,body,body_markdown,status,scheduled_at,published_at,season_id").eq("id", id).maybeSingle(),
    client.from("media_assets").select("id,title,mime_type,alt_text,is_public").order("created_at", { ascending: false }).limit(100)
  ]);
  if (!entry) notFound();
  const [{ data: teams }, { data: seasons }] = await Promise.all([client.from("teams").select("id,name,number,slug").order("sort_order"), client.from("seasons").select("id,name,team_id,status").order("start_date", { ascending: false, nullsFirst: false })]);
  const { data: revisions } = user.role === "admin" ? await client.from("content_revisions").select("id,version,created_at").eq("entry_id", id).order("version", { ascending: false }).limit(20) : { data: [] };
  const { saved, restored } = await searchParams;
  return <main id="main-content" className="admin-shell"><section className="admin-dashboard admin-editor">
    <div className="admin-top"><div><span className="section-tag">CONTENT / EDIT</span><h1>{entry.title}<span className="period">.</span></h1><p>{entry.status} · <a href="/admin">Back to dashboard</a> · <a href={`/admin/preview/${entry.id}`}>Preview ↗</a></p></div></div>
    {saved && <div className="notice-success">Entry saved.</div>}{restored && <div className="notice-success">Revision restored. The previous version was saved as a new revision.</div>}
    <form action={updateEntry} className="entry-form editor-form">
      <input type="hidden" name="id" value={entry.id}/>
      <label>Title<input name="title" required minLength={3} maxLength={140} defaultValue={entry.title}/></label>
      <label>URL slug<input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" defaultValue={entry.slug}/></label>
      <label>Content type<select name="type" defaultValue={entry.type}><option value="news">News</option><option value="journal">Build journal</option><option value="project">Engineering project</option></select></label>
      <label>Team<select name="team_id" defaultValue={entry.team_id ?? ""}><option value="">Shared / team not assigned</option>{teams?.map(team=><option key={team.id} value={team.id}>{team.name} · {team.number}</option>)}</select><small>Team ownership controls which team profile includes this entry.</small></label>
      <label>Season (optional)<select name="season_id" defaultValue={entry.season_id ?? ""}><option value="">Not season-specific</option>{seasons?.map(season=><option key={season.id} value={season.id}>{season.name}{season.team_id?` · ${teams?.find(team=>team.id===season.team_id)?.name??"Team"}`:" · Shared"}{season.status==="published"?"":" · DRAFT"}</option>)}</select></label>
      <label>Summary<textarea name="summary" maxLength={500} rows={3} defaultValue={entry.summary}/></label>
      <SitePageBodyEditor source={entry.body_markdown ?? contentBlocksAsMarkdown(entry.body)} format="markdown" assets={assets ?? []} allowFormat={false}/>
      <label>State<select name="status" defaultValue={user.role === "admin" ? entry.status : "draft"}><option value="draft">Save as draft</option>{user.role === "admin" && <><option value="published">Published</option><option value="scheduled">Scheduled</option></>}</select></label>
      {user.role === "admin" && <label>Publish at (UTC)<input type="datetime-local" name="scheduled_at" defaultValue={entry.scheduled_at ? new Date(entry.scheduled_at).toISOString().slice(0, 16) : ""}/></label>}
      <button className="button-link" type="submit">Save changes <span>→</span></button>
    </form>
    {user.role === "admin" && <>
      <section className="admin-panel revision-panel"><span className="section-tag">HISTORY</span><h2>Revision history</h2>{revisions?.length ? revisions.map(revision => <form action={restoreRevision} key={revision.id} className="revision-row"><input type="hidden" name="entryId" value={entry.id}/><input type="hidden" name="revisionId" value={revision.id}/><span>Version {revision.version}</span><time>{new Date(revision.created_at).toLocaleString()}</time><button className="text-button" type="submit">Restore</button></form>) : <p className="admin-empty">The first revision is created when this entry is changed.</p>}</section>
      <form action={archiveEntry} className="archive-form"><input type="hidden" name="id" value={entry.id}/><p>Remove this entry from public listings while preserving its history.</p><button className="text-button" type="submit">Archive entry</button></form>
    </>}
  </section></main>;
}
