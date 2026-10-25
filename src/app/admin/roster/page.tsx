import { redirect } from "next/navigation";
import { createClient, getCmsUser } from "@/lib/supabase/server";
import RosterOrderEditor from "@/components/RosterOrderEditor";
import DeleteRosterMemberButton from "@/components/DeleteRosterMemberButton";
import Image from "next/image";
import { saveRosterMember } from "./actions";

export const metadata = { title: "Public roster", robots: { index: false, follow: false } };

export default async function AdminRosterPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const user = await getCmsUser();
  if (user?.role !== "admin") redirect("/admin/login?error=access");
  const client = await createClient();
  if (!client) redirect("/admin/login?error=setup");
  const [query, teamsResult, membersResult, assignmentsResult, photosResult] = await Promise.all([
    searchParams,
    client.from("teams").select("id,name,number,slug").eq("status", "published").order("sort_order"),
    client.from("team_members").select("id,display_name,approved_role,photo_asset_id,is_mentor,status,sort_order").order("sort_order").order("display_name"),
    client.from("team_member_teams").select("team_id,member_id,role_label,sort_order").order("sort_order"),
    client.from("media_assets").select("id,title,alt_text").eq("is_public", true).like("mime_type", "image/%").order("created_at", { ascending: false }),
  ]);
  const migrationMissing = [teamsResult.error, membersResult.error, assignmentsResult.error].some(error => error?.code === "42P01");
  const assignmentsByMember = new Map<string, Set<string>>();
  for (const assignment of assignmentsResult.data ?? []) {
    const current = assignmentsByMember.get(assignment.member_id) ?? new Set<string>();
    current.add(assignment.team_id);
    assignmentsByMember.set(assignment.member_id, current);
  }
  const memberById = new Map((membersResult.data ?? []).map(member => [member.id, member]));
  const orderedTeams = (teamsResult.data ?? []).map(team => ({
    ...team,
    people: (assignmentsResult.data ?? []).filter(assignment => assignment.team_id === team.id).flatMap(assignment => {
      const member = memberById.get(assignment.member_id);
      return member ? [{ id: member.id, name: member.display_name, role: assignment.role_label || member.approved_role || (member.is_mentor ? "Mentor" : "Team member"), status: member.status }] : [];
    }),
  }));
  const errorText = query.error === "validation" ? "Enter a name, select at least one team, and check the other fields." : query.error === "migration" ? "The roster tables or sorting function are missing. Apply the roster database migrations first." : query.error === "photo" ? "Choose a public image from the media library. Private assets cannot be used as public profile photos." : query.error ? "Could not save the roster entry. Check the database permissions and try again." : "";
  return <main id="main-content" className="admin-shell"><section className="admin-dashboard roster-admin">
    <div className="admin-top"><div><span className="section-tag">TEAM CMS / PEOPLE</span><h1>Public roster<span className="period">.</span></h1><p>Manage the names and roles shown on the team profiles and public roster. Only entries marked public are visible to visitors.</p><nav className="admin-nav"><a href="/admin">Content</a><a href="/admin/teams">Teams</a><a href="/admin/seasons">Seasons</a><a href="/admin/roster">Roster</a><a href="/admin/members">Member access</a></nav></div></div>
    {query.saved && <div className="notice-success">Roster saved. Public pages have been refreshed.</div>}{errorText && <div className="form-error" role="alert">{errorText}</div>}
    {migrationMissing ? <section className="admin-panel"><span className="section-tag">SETUP REQUIRED</span><h2>Roster tables aren’t available</h2><p>Check that the initial team schema and team-aware site migrations have been applied.</p></section> : <>
      <RosterOrderEditor teams={orderedTeams}/>
      <section className="admin-panel roster-editor-panel"><div className="panel-head"><div><span className="section-tag">NEW PERSON</span><h2>Add a student or mentor</h2></div></div><RosterForm teams={teamsResult.data ?? []} photos={photosResult.data ?? []} action={saveRosterMember}/></section>
      <section className="roster-admin-list"><div className="panel-head"><div><span className="section-tag">PUBLISHED DIRECTORY</span><h2>People</h2></div><a href="/roster" target="_blank" rel="noreferrer">Preview public roster ↗</a></div>
        {membersResult.data?.length ? membersResult.data.map(member => <details className="roster-admin-item" key={member.id}><summary><span><b>{member.display_name}</b><small>{member.approved_role || (member.is_mentor ? "Mentor" : "Team member")} · {member.status.toUpperCase()}</small></span><span>Edit　⌄</span></summary><RosterForm member={member} teams={teamsResult.data ?? []} photos={photosResult.data ?? []} selected={assignmentsByMember.get(member.id)} action={saveRosterMember}/><DeleteRosterMemberButton memberId={member.id} name={member.display_name}/></details>) : <div className="roster-empty"><b>No people added yet.</b><p>Add a student or mentor, assign them to one or both teams, then publish their name to show it on the website.</p></div>}
      </section>
    </>}
  </section></main>;
}

function RosterForm({ action, teams, photos, member, selected = new Set<string>() }: {
  action: (data: FormData) => void | Promise<void>;
  teams: { id: string; name: string; number: string }[];
  photos: { id: string; title: string; alt_text: string | null }[];
  member?: { id: string; display_name: string; approved_role: string | null; photo_asset_id: string | null; is_mentor: boolean; status: string; sort_order: number };
  selected?: Set<string>;
}) {
  return <form action={action} className="entry-form roster-form">
    <input type="hidden" name="id" value={member?.id ?? ""}/>
    <label>Full name<input name="display_name" required maxLength={100} defaultValue={member?.display_name ?? ""} placeholder="Name shown publicly"/></label>
    <label>Role<input name="approved_role" maxLength={100} defaultValue={member?.approved_role ?? ""} placeholder={member?.is_mentor ? "Mentor" : "Build lead, programmer, designer…"}/></label>
    <label>Member type<select name="is_mentor" defaultValue={member?.is_mentor ? "true" : "false"}><option value="false">Student</option><option value="true">Mentor</option></select></label>
    <label>Profile photo<select name="photo_asset_id" defaultValue={member?.photo_asset_id ?? ""}><option value="">Use initials</option>{photos.map(photo=><option value={photo.id} key={photo.id}>{photo.title}{photo.alt_text ? ` · ${photo.alt_text}` : ""}</option>)}</select><small>Only public images from the media library are listed.</small></label>
    {member?.photo_asset_id && photos.some(photo => photo.id === member.photo_asset_id) && <div className="roster-photo-preview"><Image src={`/api/media/${member.photo_asset_id}/download`} alt="" width={58} height={58} unoptimized/><span>Current profile photo</span></div>}
    <fieldset className="roster-season-choices"><legend>Team assignment</legend>{teams.map(team=><label key={team.id}><input type="checkbox" name="team_id" value={team.id} defaultChecked={selected.has(team.id)}/><span>{team.name} · Team {team.number}</span></label>)}</fieldset>
    <label>Public status<select name="status" defaultValue={member?.status ?? "draft"}><option value="draft">Draft · hidden</option><option value="published">Published · public</option><option value="archived">Archived · hidden</option></select></label>
    <button className="button-link" type="submit">{member ? "Save roster entry" : "Add to roster"} <span>→</span></button>
    <small>To add a portrait, upload it in Admin → Media library and mark it public. Use descriptive alt text there. Publish names and photos only with the school and person’s appropriate approval. Draft and archived entries remain hidden.</small>
  </form>;
}
