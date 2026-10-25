import { redirect } from "next/navigation";
import { createClient, getCmsUser } from "@/lib/supabase/server";
import { saveCmsUser } from "@/app/admin/actions";

export const metadata = { title: "Approved CMS users", robots: { index: false, follow: false } };
const messages: Record<string, string> = {
  validation: "Enter a valid email address.",
  self: "You cannot change your own role or deactivate your account here.",
  lastadmin: "The last active administrator cannot be removed or demoted.",
  authuser: "No verified Supabase Auth account matches that email. Invite or create the account in Supabase Auth, then add it here.",
  migration: "The email-based user approval function is missing. Apply supabase/migrations/202610240001_cms_user_email_approval.sql in Supabase, then try again.",
  save: "Could not update CMS access. Check database access and try again."
};

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const actor = await getCmsUser();
  if (actor?.role !== "admin") redirect("/admin/login?error=access");
  const client = await createClient();
  if (!client) redirect("/admin/login?error=setup");
  const { data: users } = await client.from("cms_users").select("id,email,role,active,created_at").order("created_at", { ascending: true });
  const { error, saved } = await searchParams;
  return <main id="main-content" className="admin-shell"><section className="admin-dashboard">
    <div className="admin-top"><div><span className="section-tag">TEAM CMS / ACCESS</span><h1>Approved users<span className="period">.</span></h1><p><a href="/admin">← Back to content</a></p></div></div>
    {saved && <div className="notice-success">Allowlist updated.</div>}{error && <div role="alert" className="form-error">{messages[error] ?? messages.save}</div>}
    <div className="admin-panel user-provisioning"><span className="section-tag">ADD A CMS USER</span><h2>Approve by email</h2><p>Enter the person’s verified email. No Auth UUID lookup or copy/paste needed. Their account must already exist and be verified in Supabase Auth; if it does not, invite them from Supabase Auth first.</p>
      <form action={saveCmsUser} className="entry-form user-form"><label>Verified email<input required type="email" name="email" placeholder="student@7hills.org" autoComplete="email"/></label><label>Role<select name="role"><option value="editor">Editor</option><option value="admin">Admin</option></select></label><label>Access<select name="active"><option value="true">Approved</option><option value="false">Disabled</option></select></label><button className="button-link" type="submit">Add or update user <span>→</span></button></form>
    </div>
    <section className="admin-panel user-list"><span className="section-tag">CURRENT ALLOWLIST</span><h2>CMS accounts</h2>{users?.length ? users.map(member=><div className="user-row" key={member.id}><div><b>{member.email}</b><small>{member.id}</small></div><span className={`user-role ${member.role}`}>{member.role}</span><span className={member.active ? "active-label" : "inactive-label"}>{member.active ? "ACTIVE" : "DISABLED"}</span></div>) : <p className="admin-empty">No CMS users found.</p>}</section>
    <p className="admin-footnote">Admins cannot demote or disable themselves in this screen, and the last active admin cannot be removed. An owner can recover access through the database dashboard.</p>
  </section></main>;
}
