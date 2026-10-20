import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getTeam } from "@/lib/teams";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params; const team = await getTeam(slug);
  return team ? { title: `${team.name} · Team ${team.number}`, description: team.summary } : {};
}

export default async function TeamPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const team = await getTeam(slug); if (!team) notFound();
  const client = await createClient();
  const { data: seasons } = client && team.id ? await client.from("seasons").select("id,name,slug,year_label,start_date,is_current,summary").eq("team_id", team.id).eq("status", "published").order("start_date", { ascending: false, nullsFirst: false }) : { data: [] };
  const seasonIds = (seasons ?? []).map(season => season.id);
  const [entryResult, robotResult, outreachResult, membershipResult] = await Promise.all([
    client && team.id ? client.from("published_content_entries").select("title,slug,type,summary,published_at").eq("team_id", team.id).order("published_at", { ascending: false }).limit(6) : Promise.resolve({ data: [] }),
    client && seasonIds.length ? client.from("robots").select("id,name,summary,season_id").in("season_id", seasonIds).eq("status", "published").order("name") : Promise.resolve({ data: [] }),
    client && seasonIds.length ? client.from("outreach_events").select("id,name,event_date,description,season_id").in("season_id", seasonIds).eq("status", "published").order("event_date", { ascending: false }).limit(6) : Promise.resolve({ data: [] }),
    client && seasonIds.length ? client.from("season_memberships").select("member_id,season_id,role_label").in("season_id", seasonIds) : Promise.resolve({ data: [] })
  ]);
  const memberIds = [...new Set((membershipResult.data ?? []).map(item => item.member_id))];
  const { data: members } = client && memberIds.length ? await client.from("team_members").select("id,display_name,approved_role,is_mentor").in("id", memberIds).eq("status", "published").order("sort_order") : { data: [] };
  const memberById = new Map((members ?? []).map(member => [member.id, member]));
  const teamMembers = [...new Map((membershipResult.data ?? []).flatMap(membership => {
    const member = memberById.get(membership.member_id);
    return member ? [[member.id, { ...member, role: membership.role_label || member.approved_role || (member.is_mentor ? "Mentor" : "Team member") }] as const] : [];
  })).values()];
  const seasonName = (seasonId: string) => seasons?.find(season => season.id === seasonId)?.name ?? "Season";

  return <main id="main-content" className="team-profile wrap">
    <Link className="text-link" href="/teams"><ArrowLeft size={15}/> All teams</Link>
    <div className="team-profile-heading">
      <span className="section-tag">SEVEN HILLS SCHOOL · FIRST TECH CHALLENGE</span>
      <h1>{team.name}<span className="period">.</span></h1>
      <p>Team number <strong>{team.number}</strong></p><p className="team-summary">{team.summary}</p>
    </div>
    <section className="team-profile-section">
      <div className="team-profile-section-heading"><span className="section-tag">SEASON ARCHIVE</span><Link href="/seasons">All seasons <ArrowUpRight size={14}/></Link></div>
      {seasons?.length ? <div className="team-profile-grid">{seasons.map(season=><Link className="team-profile-card" href={`/seasons/${season.slug}`} key={season.id}><small>{season.is_current ? "CURRENT SEASON" : season.year_label || season.start_date?.slice(0,4) || "ARCHIVE"}</small><b>{season.name}<ArrowUpRight size={16}/></b>{season.summary && <p>{season.summary}</p>}</Link>)}</div> : <p className="team-profile-empty">Season records for {team.name} will appear here as they are added.</p>}
    </section>
    {robotResult.data?.length ? <section className="team-profile-section"><div className="team-profile-section-heading"><span className="section-tag">ROBOTS</span></div><div className="team-profile-grid">{robotResult.data.map(robot=><Link className="team-profile-card" href={seasons?.find(season=>season.id===robot.season_id) ? `/seasons/${seasons.find(season=>season.id===robot.season_id)?.slug}` : `/teams/${team.slug}`} key={robot.id}><small>{seasonName(robot.season_id)}</small><b>{robot.name}<ArrowUpRight size={16}/></b>{robot.summary && <p>{robot.summary}</p>}</Link>)}</div></section> : null}
    {teamMembers.length ? <section className="team-profile-section"><div className="team-profile-section-heading"><span className="section-tag">APPROVED ROSTER</span></div><div className="team-member-grid">{teamMembers.map(member=><article className="team-member-card" key={`${member.id}-${member.role}`}><b>{member.display_name}</b><span>{member.role}</span></article>)}</div></section> : null}
    <section className="team-profile-section">
      <div className="team-profile-section-heading"><span className="section-tag">LATEST FROM THE TEAM</span><Link href="/journal">All updates <ArrowUpRight size={14}/></Link></div>
      {entryResult.data?.length ? <div className="team-profile-grid">{entryResult.data.map(entry=><Link className="team-profile-card" href={`/${entry.type === "project" ? "projects" : entry.type}/${entry.slug}`} key={entry.slug}><small>{entry.type.toUpperCase()}{entry.published_at ? ` · ${new Date(entry.published_at).toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric"})}` : ""}</small><b>{entry.title}<ArrowUpRight size={16}/></b><p>{entry.summary}</p></Link>)}</div> : <p className="team-profile-empty">Published updates, projects, and build notes for {team.name} will appear here.</p>}
    </section>
    {outreachResult.data?.length ? <section className="team-profile-section"><div className="team-profile-section-heading"><span className="section-tag">COMMUNITY OUTREACH</span></div><div className="team-profile-grid">{outreachResult.data.map(event=><article className="team-profile-card" key={event.id}><small>{seasonName(event.season_id)}{event.event_date ? ` · ${new Date(event.event_date + "T12:00:00").toLocaleDateString("en-US", {year:"numeric",month:"short",day:"numeric"})}` : ""}</small><b>{event.name}</b>{event.description&&<p>{event.description}</p>}</article>)}</div></section> : null}
    <div className="team-profile-switch"><span>SEVEN HILLS FTC · EVERY TEAM, EQUAL PLACE</span><Link href="/teams">Explore all teams <ArrowUpRight size={14}/></Link></div>
  </main>;
}
