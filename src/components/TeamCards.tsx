import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { teams as fallbackTeams, type Team } from "@/lib/teams";

export default function TeamCards({ compact = false, teams = fallbackTeams }: { compact?: boolean; teams?: Team[] }) {
  return <div className={`team-cards${compact ? " team-cards-compact" : ""}`}>
    {teams.map((team) => <Link className="team-card" href={`/teams/${team.slug}`} key={team.slug}>
      <span className="team-card-kicker">SEVEN HILLS FTC</span>
      <span className="team-card-title">{team.name}<ArrowUpRight aria-hidden="true" size={17}/></span>
      <span className="team-card-number">{team.number}</span>
    </Link>)}
  </div>;
}
