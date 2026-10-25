import { redirect } from "next/navigation";
import { createClient, getCmsUser } from "@/lib/supabase/server";
import { getTeams } from "@/lib/teams";
import { saveMemberAnnouncement, saveMemberEvent, saveMemberResource } from "@/app/admin/members/actions";

export const metadata = { title: "Member hub content", robots: { index: false, follow: false } };

const localDateTime = (value: string | null) => {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(value));
  const part = (key: string) => parts.find(item => item.type === key)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
};

export default async function MemberContentAdminPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const user = await getCmsUser();
  if (user?.role !== "admin") redirect("/admin/login?error=access");
  const client = await createClient();
  if (!client) redirect("/admin/login?error=setup");
  const [{ data: announcements, error }, { data: events }, { data: resources }, { data: assets }, teams, query] = await Promise.all([
    client.from("member_announcements").select("id,title,body_markdown,team_id,pinned,active").order("created_at", { ascending: false }),
    client.from("member_events").select("id,title,start_at,end_at,location,details,team_id,active").order("start_at", { ascending: false }),
    client.from("member_resources").select("id,title,description,category,url,asset_id,team_id,active").order("created_at", { ascending: false }),
    client.from("media_assets").select("id,title,mime_type,is_public").order("created_at", { ascending: false }).limit(100),
    getTeams(), searchParams
  ]);
  const teamTitle = (id: string | null) => teams.find(team => team.id === id)?.name ?? "Shared with all members";
  const migrationMissing = error?.code === "42P01" || error?.code === "PGRST205";
  const errorText = query.error === "validation" ? "Review the required fields and file/link selection." : query.error === "save" ? "The item could not be saved. Check the database connection and try again." : "";

  return <main id="main-content" className="admin-shell"><section className="admin-dashboard member-content-admin">
    <div className="admin-top"><div><span className="section-tag">TEAM CMS / MEMBERS</span><h1>Member hub content<span className="period">.</span></h1><p>Post private updates, put team dates on the calendar, and collect useful files and links. Choose a team or make an item shared.</p><nav className="admin-nav"><a href="/admin">Content</a><a href="/admin/members">Member access</a><a href="/admin/member-content">Member hub content</a></nav></div></div>
    {query.saved && <div className="notice-success">Member hub item saved.</div>}{errorText && <div className="form-error" role="alert">{errorText}</div>}
    {migrationMissing ? <section className="admin-panel"><span className="section-tag">SETUP REQUIRED</span><h2>Install the member hub</h2><p>Run <code>supabase/migrations/202610240002_member_portal.sql</code> in Supabase to create the member-only content tables.</p></section> : <>
      <section className="admin-panel"><span className="section-tag">TEAM BULLETIN</span><h2>Announcements</h2><form action={saveMemberAnnouncement} className="entry-form member-content-form"><AnnouncementFields teams={teams}/><button className="button-link" type="submit">Post announcement <span>→</span></button></form>
        <div className="member-admin-items">{announcements?.map(item=><details className="member-content-row" key={item.id}><summary><span><b>{item.title}</b><small>{teamTitle(item.team_id)} · {item.active ? "LIVE" : "ARCHIVED"}{item.pinned ? " · PINNED" : ""}</small></span><span>Edit　⌄</span></summary><form action={saveMemberAnnouncement} className="entry-form member-content-form"><input type="hidden" name="id" value={item.id}/><AnnouncementFields teams={teams} item={item}/><button className="button-link" type="submit">Save announcement <span>→</span></button></form></details>)}</div>
      </section>
      <section className="admin-panel"><span className="section-tag">ON THE CALENDAR</span><h2>Events</h2><form action={saveMemberEvent} className="entry-form member-content-form"><EventFields teams={teams}/><button className="button-link" type="submit">Add event <span>→</span></button></form>
        <div className="member-admin-items">{events?.map(item=><details className="member-content-row" key={item.id}><summary><span><b>{item.title}</b><small>{localDateTime(item.start_at)} · {teamTitle(item.team_id)} · {item.active ? "ACTIVE" : "ARCHIVED"}</small></span><span>Edit　⌄</span></summary><form action={saveMemberEvent} className="entry-form member-content-form"><input type="hidden" name="id" value={item.id}/><EventFields teams={teams} item={{...item,start_at:localDateTime(item.start_at),end_at:localDateTime(item.end_at)}}/><button className="button-link" type="submit">Save event <span>→</span></button></form></details>)}</div>
      </section>
      <section className="admin-panel"><span className="section-tag">SHARED FILES & LINKS</span><h2>Resources</h2><p className="admin-empty">Attach a file from the media library or provide an HTTPS link. Private uploaded files are only delivered to members who can access the selected team.</p><form action={saveMemberResource} className="entry-form member-content-form"><ResourceFields teams={teams} assets={assets ?? []}/><button className="button-link" type="submit">Add resource <span>→</span></button></form>
        <div className="member-admin-items">{resources?.map(item=><details className="member-content-row" key={item.id}><summary><span><b>{item.title}</b><small>{teamTitle(item.team_id)} · {item.active ? "ACTIVE" : "ARCHIVED"}</small></span><span>Edit　⌄</span></summary><form action={saveMemberResource} className="entry-form member-content-form"><input type="hidden" name="id" value={item.id}/><ResourceFields teams={teams} assets={assets ?? []} item={item}/><button className="button-link" type="submit">Save resource <span>→</span></button></form></details>)}</div>
      </section>
    </>}
  </section></main>;
}

function TeamField({ teams, selected }: { teams: Awaited<ReturnType<typeof getTeams>>; selected?: string | null }) {
  return <label>Audience<select name="team_id" defaultValue={selected ?? ""}><option value="">Shared · all members</option>{teams.map(team=><option value={team.id} key={team.slug}>{team.name} · {team.number}</option>)}</select></label>;
}

function ActiveField({ active = true }: { active?: boolean }) {
  return <label className="member-active-choice"><input type="checkbox" name="active" defaultChecked={active}/> Visible in the member hub</label>;
}

function AnnouncementFields({ teams, item }: { teams: Awaited<ReturnType<typeof getTeams>>; item?: { title: string; body_markdown: string; team_id: string | null; pinned: boolean; active: boolean } }) {
  return <><label>Title<input name="title" required maxLength={160} defaultValue={item?.title ?? ""}/></label><TeamField teams={teams} selected={item?.team_id}/><label>Update <small>Markdown supported</small><textarea name="body_markdown" rows={6} maxLength={20000} defaultValue={item?.body_markdown ?? ""} placeholder="Share the details with your team…"/></label><label className="member-active-choice"><input type="checkbox" name="pinned" defaultChecked={item?.pinned ?? false}/> Pin this update</label><ActiveField active={item?.active ?? true}/></>;
}

function EventFields({ teams, item }: { teams: Awaited<ReturnType<typeof getTeams>>; item?: { title: string; start_at: string; end_at: string | null; location: string; details: string; team_id: string | null; active: boolean } }) {
  return <><label>Event name<input name="title" required maxLength={160} defaultValue={item?.title ?? ""}/></label><TeamField teams={teams} selected={item?.team_id}/><div className="member-date-fields"><label>Starts (Eastern time)<input type="datetime-local" name="start_at" required defaultValue={item?.start_at ?? ""}/></label><label>Ends (optional)<input type="datetime-local" name="end_at" defaultValue={item?.end_at ?? ""}/></label></div><label>Location<input name="location" maxLength={240} defaultValue={item?.location ?? ""} placeholder="Workshop, school gym, competition venue"/></label><label>Details<textarea name="details" rows={3} maxLength={3000} defaultValue={item?.details ?? ""}/></label><ActiveField active={item?.active ?? true}/></>;
}

function ResourceFields({ teams, assets, item }: { teams: Awaited<ReturnType<typeof getTeams>>; assets: { id: string; title: string; mime_type: string; is_public: boolean }[]; item?: { title: string; description: string; category: string; url: string | null; asset_id: string | null; team_id: string | null; active: boolean } }) {
  return <><label>Title<input name="title" required maxLength={160} defaultValue={item?.title ?? ""}/></label><TeamField teams={teams} selected={item?.team_id}/><label>Category<input name="category" required maxLength={60} defaultValue={item?.category ?? "General"}/></label><label>Description<input name="description" maxLength={500} defaultValue={item?.description ?? ""}/></label><label>HTTPS link <small>Use this or choose a file below</small><input type="url" name="url" defaultValue={item?.url ?? ""} placeholder="https://…"/></label><label>Uploaded file<select name="asset_id" defaultValue={item?.asset_id ?? ""}><option value="">No attached file</option>{assets.map(asset=><option value={asset.id} key={asset.id}>{asset.title} · {asset.mime_type}{asset.is_public ? " · public" : " · private"}</option>)}</select></label><ActiveField active={item?.active ?? true}/></>;
}
