import type { Metadata } from "next";
import TeamCards from "@/components/TeamCards";
import { getTeams } from "@/lib/teams";

export const metadata: Metadata = {
  title: "Our teams",
  description: "Meet the Seven Hills School FIRST Tech Challenge teams, BuzzerBots 23826 and Hive Mind 36438.",
};

export default async function TeamsPage() {
  const teams = await getTeams();
  return <main id="main-content" className="team-directory wrap">
    <div className="page-intro">
      <span className="eyebrow">SEVEN HILLS SCHOOL · FIRST TECH CHALLENGE</span>
      <h1>Our teams.<br/><em>One community.</em></h1>
      <p className="lead">BuzzerBots and Hive Mind compete as distinct teams, sharing the curiosity and community of Seven Hills FTC.</p>
    </div>
    <TeamCards teams={teams}/>
  </main>;
}
