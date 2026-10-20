import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTeam, teams } from "@/lib/teams";

export function generateStaticParams() {
  return teams.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const team = getTeam(slug);
  return team ? { title: `${team.name} · Team ${team.number}`, description: `Seven Hills School FIRST Tech Challenge team ${team.number}.` } : {};
}

export default async function TeamPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const team = getTeam(slug);
  if (!team) notFound();

  return <main id="main-content" className="team-profile wrap">
    <Link className="text-link" href="/teams"><ArrowLeft size={15}/> All teams</Link>
    <div className="team-profile-heading">
      <span className="section-tag">SEVEN HILLS SCHOOL · FIRST TECH CHALLENGE</span>
      <h1>{team.name}<span className="period">.</span></h1>
      <p>Team number <strong>{team.number}</strong></p>
    </div>
    <div className="team-profile-note"><span>TEAM PROFILE</span><p>Team updates and project details will appear here as they are added.</p></div>
  </main>;
}
