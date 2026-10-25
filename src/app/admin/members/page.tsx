import { redirect } from "next/navigation";
import { createClient, getCmsUser } from "@/lib/supabase/server";
import { getTeams } from "@/lib/teams";
import { saveMemberPortalAccess } from "./actions";

export const metadata = { title: "Member access", robots: { index: false, follow: false } };

export default async function MemberAccessPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string; invite?: string }> }) {
  const user = await getCmsUser();
  if (user?.role !== "admin") redirect("/admin/login?error=access");
  const client = await createClient();
  if (!client) redirect("/admin/login?error=setup");
  const [{ data: members, error: membersError }, { data: access }, teams, query] = await Promise.all([
    client.from("member_portal_users").select("id,email,display_name,role,active").order("email"),
    client.from("member_team_access").select("member_id,team_id"),
    getTeams(),
    searchParams
  ]);
  const slugsByMember = new Map<string, Set<string>>();
  for (const link of access ?? []) {
    const slug = teams.find(team => team.id === link.team_id)?.slug;
    if (slug) { const current = slugsByMember.get(link.member_id) ?? new Set<string>(); current.add(slug); slugsByMember.set(link.member_id, current); }
  }
  const messages: Record<string, string> = {
    migration: "The member portal migration is not installed yet. Run supabase/migrations/202610240002_member_portal.sql in Supabase.",
    validation: "Check the email and team selections, then try again.",
    save: "Could not update member access. Check the database connection and try again."
  };
  const unavailable = membersError?.code === "42P01" || membersError?.code === "PGRST205";

  return <main id="main-content" className="admin-shell"><section className="admin-dashboard member-admin">
    <div className="admin-top"><div><span className="section-tag">TEAM CMS / MEMBER ACCESS</span><h1>Members<span className="period">.</span></h1><p>Add member and mentor emails, set their team access, and pause it when needed. They sign in through a one-time email link.</p><nav className="admin-nav"><a href="/admin">Content</a><a href="/admin/members">Member access</a><a href="/admin/member-content">Member hub content</a></nav></div></div>
    {query.saved && <div className="notice-success">{query.invite === "invited" ? "Member access saved and an account invitation was sent." : query.invite === "existing" ? "Member access saved. The Auth account already exists; they can request a sign-in link." : query.invite === "manual" ? "Member access saved. Configure SUPABASE_SECRET_KEY for automatic invites, or invite the user in Supabase Authentication → Users." : query.invite === "failed" ? "Member access was saved, but the Auth invite could not be sent. Check Supabase Auth or try again." : "Member access saved."}</div>}{query.error && <div className="form-error" role="alert">{messages[query.error] ?? messages.save}</div>}
    {unavailable ? <section className="admin-panel"><h2>Install the member hub database</h2><p>Run <code>supabase/migrations/202610240002_member_portal.sql</code> in Supabase to create the private member area and access controls.</p></section> : <>
      <section className="admin-panel member-add-panel"><span className="section-tag">ADD OR UPDATE ACCESS</span><h2>Approve a team member</h2><p>Enter the member’s email and team. We’ll send an Auth invite if they don’t already have an account. After verifying their email, they can request a one-time sign-in link at <a href="/members/login">/members/login</a>. Public signups stay disabled.</p>
        <MemberAccessForm teams={teams} action={saveMemberPortalAccess}/>
      </section>
      <section className="admin-panel member-admin-list"><div className="panel-head"><div><span className="section-tag">ACCESS LIST</span><h2>Approved members and mentors</h2></div><span>{members?.length ?? 0} accounts</span></div>
        {members?.length ? <div className="member-access-list">{members.map(member => <details className="member-access-row" key={member.id}><summary><span><b>{member.display_name || member.email}</b><small>{member.email} · {member.role}{member.active ? " · ACTIVE" : " · PAUSED"}</small></span><span>{member.active ? "Edit access" : "Review"}　⌄</span></summary><MemberAccessForm teams={teams} action={saveMemberPortalAccess} member={member} selectedSlugs={slugsByMember.get(member.id)}/></details>)}</div> : <p className="admin-empty">No members have been added yet.</p>}
      </section>
    </>}
  </section></main>;
}

function MemberAccessForm({ teams, action, member, selectedSlugs = new Set<string>() }: { teams: Awaited<ReturnType<typeof getTeams>>; action: (data: FormData) => void | Promise<void>; member?: { email: string; display_name: string; role: string; active: boolean }; selectedSlugs?: Set<string> }) {
  return <form action={action} className="entry-form member-access-form">
    <label>Email<input type="email" name="email" required maxLength={254} defaultValue={member?.email ?? ""} readOnly={!!member}/></label>
    <label>Display name<input type="text" name="display_name" maxLength={120} defaultValue={member?.display_name ?? ""} placeholder="Name shown in the portal"/></label>
    <label>Account type<select name="role" defaultValue={member?.role ?? "member"}><option value="member">Team member</option><option value="mentor">Mentor</option></select></label>
    <label>Access<select name="active" defaultValue={member?.active === false ? "false" : "true"}><option value="true">Approved</option><option value="false">Paused</option></select></label>
    <fieldset><legend>Teams this person can access</legend>{teams.map(team=><label className="member-team-choice" key={team.slug}><input type="checkbox" name="team_slugs" value={team.slug} defaultChecked={selectedSlugs.has(team.slug)}/><span>{team.name} · {team.number}</span></label>)}</fieldset>
    <button className="button-link" type="submit">{member ? "Save member access" : "Add member"} <span>→</span></button>
  </form>;
}
