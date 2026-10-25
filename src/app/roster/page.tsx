import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPublicSeasons, seasonBelongsToTeam } from "@/lib/seasons";
import { getTeams } from "@/lib/teams";

export const metadata: Metadata = {
  title: "Team roster",
  description: "Meet the students and mentors of BuzzerBots 23826 and Hive Mind 36438.",
};

export default async function RosterPage() {
  const [teams, seasons, client] = await Promise.all([getTeams(), getPublicSeasons(), createClient()]);
  const rosterGroups = await Promise.all(teams.map(async team => {
    const teamSeasons = seasons.filter(season => seasonBelongsToTeam(season, team));
    const currentSeasons = teamSeasons.filter(season => season.current);
    const rosterSeasons = currentSeasons.length ? currentSeasons : teamSeasons.slice(0, 1);
    const { data: memberships } = client && team.id
      ? await client.from("team_member_teams").select("member_id,role_label,sort_order").eq("team_id", team.id).order("sort_order")
      : { data: [] };
    const memberIds = [...new Set((memberships ?? []).map(item => item.member_id))];
    const { data: members } = client && memberIds.length
      ? await client.from("team_members").select("id,display_name,approved_role,is_mentor,sort_order").in("id", memberIds).eq("status", "published").order("sort_order").order("display_name")
      : { data: [] };
    const memberById = new Map((members ?? []).map(member => [member.id, member]));
    const people = [...new Map((memberships ?? []).flatMap(membership => {
      const member = memberById.get(membership.member_id);
      return member ? [[member.id, {
        ...member,
        role: membership.role_label || member.approved_role || (member.is_mentor ? "Mentor" : "Team member"),
      }] as const] : [];
    })).values()];
    return { team, seasons: rosterSeasons, people };
  }));

  return <main id="main-content" className="roster-page">
    <header className="roster-hero">
      <div className="wrap roster-hero-inner">
        <div>
          <span className="section-tag">THE PEOPLE BEHIND THE ROBOTS</span>
          <h1>Meet the<br/><em>teams.</em></h1>
          <p>Students and mentors bring BuzzerBots and Hive Mind to life. Two teams, two rosters, one Seven Hills FTC community.</p>
        </div>
        <div className="roster-hero-stamp" aria-hidden="true"><Users size={38} strokeWidth={1}/><span>STUDENT<br/>ENGINEERING</span><b>23826 · 36438</b></div>
      </div>
    </header>
    <section className="wrap roster-groups" aria-label="Team rosters">
      {rosterGroups.map(({ team, seasons: rosterSeasons, people }, index) => <section className={`roster-group roster-group-${index % 2 ? "second" : "first"}`} key={team.slug}>
        <header className="roster-group-head">
          <div><span className="section-tag">TEAM {team.number}{rosterSeasons[0] ? ` · ${rosterSeasons[0].name.toUpperCase()}` : " · SEVEN HILLS FTC"}</span><h2>{team.name}<span className="period">.</span></h2><p>{team.summary}</p></div>
          <Link href={`/teams/${team.slug}`} className="roster-team-link">Team profile <ArrowUpRight size={16}/></Link>
        </header>
        {people.length ? <div className="roster-grid">{people.map((person, personIndex) => <article className="roster-card" key={person.id}>
          <span className="roster-card-number">{String(personIndex + 1).padStart(2, "0")}</span>
          <span className="roster-avatar" aria-hidden="true">{person.display_name.trim().split(/\s+/).slice(0, 2).map((part: string) => part[0]).join("").toUpperCase()}</span>
          <div><h3>{person.display_name}</h3><p>{person.role}</p></div>
          <span className="roster-card-mark" aria-hidden="true">{person.is_mentor ? "MENTOR" : "TEAM"}</span>
        </article>)}</div> : <div className="roster-empty"><span className="roster-empty-mark"><Users size={23}/></span><div><b>Roster coming soon</b><p>Approved student and mentor names for {team.name} will appear here when the team publishes them.</p></div></div>}
      </section>)}
    </section>
    <section className="roster-join"><div className="wrap roster-join-inner"><span className="section-tag">BUILD WITH US</span><h2>Curiosity belongs<br/>in the workshop<span className="period">.</span></h2><p>Visit a team profile to explore the robots, season archives, and engineering work created by these people.</p><Link href="/teams" className="button-link">Explore both teams <ArrowUpRight size={15}/></Link></div></section>
  </main>;
}
