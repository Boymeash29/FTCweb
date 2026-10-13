import { notFound, redirect } from "next/navigation";
import { createClient, getCmsUser } from "@/lib/supabase/server";
import { saveSeason } from "../actions";

export const metadata = { title: "Edit season", robots: { index: false, follow: false } };

export default async function EditSeason({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const user = await getCmsUser();
  if (user?.role !== "admin") redirect("/admin/login?error=access");
  const client = await createClient();
  if (!client) redirect("/admin/login?error=setup");
  const { id } = await params;
  const [{ data: season }, { error }] = await Promise.all([
    client.from("seasons").select("id,name,slug,year_label,start_date,end_date,summary,is_current,status").eq("id", id).maybeSingle(),
    searchParams
  ]);
  if (!season) notFound();
  const errorText = error === "validation" ? "Check the season name, URL, and date range." : error === "duplicate" ? "That URL is already used by another season." : error ? "Could not save the season. Confirm the database migration is installed and try again." : "";

  return <main id="main-content" className="admin-shell"><section className="admin-dashboard admin-editor">
    <div className="admin-top"><div><span className="section-tag">TEAM CMS / SEASONS</span><h1>Edit season<span className="period">.</span></h1><p><a href="/admin/seasons">← All seasons</a> · {season.name}</p></div></div>
    {errorText && <div role="alert" className="form-error">{errorText}</div>}
    <form action={saveSeason} className="entry-form editor-form season-edit-form">
      <input type="hidden" name="id" value={season.id}/>
      <label>Season name<input name="name" required maxLength={120} defaultValue={season.name}/></label>
      <label>URL slug<input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" defaultValue={season.slug}/><small>Changing the URL updates the season’s public link.</small></label>
      <label>Year label<input name="year_label" maxLength={40} defaultValue={season.year_label ?? ""}/></label>
      <label>Short description<textarea name="summary" rows={5} maxLength={2000} defaultValue={season.summary ?? ""}/></label>
      <div className="season-date-fields"><label>Start date<input type="date" name="start_date" defaultValue={season.start_date ?? ""}/></label><label>End date<input type="date" name="end_date" defaultValue={season.end_date ?? ""}/></label></div>
      <label>Visibility<select name="status" defaultValue={season.status}><option value="draft">Draft (hidden)</option><option value="published">Published on website</option><option value="archived">Archived (hidden)</option></select></label>
      <label className="checkbox-label"><input type="checkbox" name="is_current" value="true" defaultChecked={season.is_current}/> Set as current season</label>
      <button className="button-link" type="submit">Save season <span>→</span></button>
    </form>
  </section></main>;
}
