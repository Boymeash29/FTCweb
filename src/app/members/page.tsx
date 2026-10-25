import Link from "next/link";
import { ArrowUpRight, CalendarDays, Download, FileText, Megaphone } from "lucide-react";
import MarkdownContent from "@/components/MarkdownContent";
import { createClient } from "@/lib/supabase/server";
import { getMemberPortalUser } from "@/lib/members";
import { signOutMember } from "@/app/members/actions";

export const metadata = { title: "Member hub", description: "A private space for Seven Hills FTC team members.", robots: { index: false, follow: false } };
const eastern = (value: string) => new Date(value).toLocaleString("en-US", { timeZone: "America/New_York", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" });

export default async function MembersPage() {
  const member = await getMemberPortalUser();
  if (!member) return <main id="main-content" className="member-shell"><section className="member-welcome"><div><span className="section-tag">SEVEN HILLS FTC · MEMBER HUB</span><h1>One place for<br />team life<span className="period">.</span></h1><p>Schedules, team updates, and the files you need to build together. Sign in with your approved email to see your team’s private space.</p><Link href="/members/login" className="button-link">Member sign in <ArrowUpRight size={15} /></Link></div><div className="member-welcome-art" aria-hidden="true"><span className="member-welcome-orbit"/><span className="member-welcome-mark">SH<br/><small>FTC</small></span><span className="member-welcome-code">23826 / 36438</span></div></section></main>;

  if (member.status === "setup") return <main id="main-content" className="member-shell"><section className="member-state-card"><span className="section-tag">MEMBER HUB / SETUP</span><h1>Almost ready<span className="period">.</span></h1><p>The member area is waiting for its database migration. A site administrator can apply <code>202610240002_member_portal.sql</code> in Supabase to finish setup.</p></section></main>;
  if (member.status !== "active") return <main id="main-content" className="member-shell"><section className="member-state-card"><span className="section-tag">MEMBER HUB / ACCESS</span><h1>{member.status === "inactive" ? "Access paused" : "Approval needed"}<span className="period">.</span></h1><p>Signed in as <b>{member.email}</b>. Ask a team administrator to approve this email for member access and select your team.</p><form action={signOutMember}><button className="text-button" type="submit">Sign out</button></form></section></main>;

  const client = await createClient();
  if (!client) return null;
  const [{ data: announcements }, { data: events }, { data: resources }] = await Promise.all([
    client.from("member_announcements").select("id,title,body_markdown,team_id,pinned,created_at").eq("active", true).order("pinned", { ascending: false }).order("created_at", { ascending: false }).limit(10),
    client.from("member_events").select("id,title,start_at,end_at,location,details,team_id").eq("active", true).gte("start_at", new Date().toISOString()).order("start_at").limit(12),
    client.from("member_resources").select("id,title,description,category,url,asset_id,team_id").eq("active", true).order("category").order("title").limit(40)
  ]);
  const teamName = (teamId: string | null) => teamId ? member.teams.find(team => team.id === teamId)?.name ?? "Your team" : "Shared";

  return <main id="main-content" className="member-hub">
    <section className="member-dashboard-hero"><div className="wrap member-dashboard-inner"><div><span className="section-tag">SEVEN HILLS FTC · MEMBER HUB</span><h1>Welcome back, {member.name}<span className="period">.</span></h1><p>{member.role === "mentor" ? "Mentor" : "Team member"} · {member.teams.length ? member.teams.map(team => `${team.name} ${team.number}`).join(" · ") : "Shared team access"}</p></div><form action={signOutMember}><button className="text-button" type="submit">Sign out</button></form></div></section>

    <section className="wrap member-dashboard-grid">
      <div className="member-dashboard-main">
        <section className="member-panel member-announcements"><div className="member-panel-heading"><div><span className="section-tag"><Megaphone size={12}/> TEAM BULLETIN</span><h2>Latest updates</h2></div><span>{announcements?.length ?? 0} updates</span></div>
          {announcements?.length ? announcements.map(item => <article className="member-announcement" key={item.id}><div><span className="member-team-label">{teamName(item.team_id)}{item.pinned ? " · PINNED" : ""}</span><time>{new Date(item.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric" })}</time></div><h3>{item.title}</h3>{item.body_markdown && <MarkdownContent source={item.body_markdown}/>}</article>) : <p className="member-empty">No updates yet. New team announcements will appear here.</p>}
        </section>
        <section className="member-panel member-calendar"><div className="member-panel-heading"><div><span className="section-tag"><CalendarDays size={12}/> ON THE CALENDAR</span><h2>Upcoming events</h2></div><span>{events?.length ?? 0} scheduled</span></div>
          {events?.length ? <div className="member-event-list">{events.map(event => <article className="member-event" key={event.id}><time><b>{new Date(event.start_at).toLocaleDateString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric" })}</b><span>{new Date(event.start_at).toLocaleDateString("en-US", { timeZone: "America/New_York", weekday: "short" })}</span></time><div><span className="member-team-label">{teamName(event.team_id)} · {eastern(event.start_at)}</span><h3>{event.title}</h3><p>{[event.location, event.details].filter(Boolean).join(" · ")}</p></div></article>)}</div> : <p className="member-empty">No events are scheduled yet.</p>}
        </section>
      </div>
      <aside className="member-dashboard-side"><section className="member-panel member-resources"><div className="member-panel-heading"><div><span className="section-tag"><FileText size={12}/> SHARED FILES & LINKS</span><h2>Team resources</h2></div></div>
          {resources?.length ? <div className="member-resource-list">{resources.map(resource => <a className="member-resource" href={resource.asset_id ? `/api/media/${resource.asset_id}/download` : resource.url ?? "#"} key={resource.id} target={resource.url ? "_blank" : undefined} rel={resource.url ? "noreferrer" : undefined}><span className="member-resource-icon"><Download size={15}/></span><span><small>{resource.category} · {teamName(resource.team_id)}</small><b>{resource.title}</b>{resource.description && <em>{resource.description}</em>}</span><ArrowUpRight size={14}/></a>)}</div> : <p className="member-empty">Team handbooks, build files, and useful links will be collected here.</p>}
        </section><section className="member-help-card"><span className="section-tag">NEED A HAND?</span><h2>Find your people.</h2><p>Ask a mentor or team lead if you need help with access, a schedule, or a resource.</p><Link href="/contact">Contact the team <ArrowUpRight size={14}/></Link></section></aside>
    </section>
  </main>;
}
