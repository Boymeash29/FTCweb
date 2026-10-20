import type { Metadata } from "next";
import TeamCards from "@/components/TeamCards";

export const metadata: Metadata = {
  title: "Our teams",
  description: "Meet the two Seven Hills School FIRST Tech Challenge teams.",
};

export default function TeamsPage() {
  return <main id="main-content" className="team-directory wrap">
    <div className="page-intro">
      <span className="eyebrow">SEVEN HILLS SCHOOL · FIRST TECH CHALLENGE</span>
      <h1>Two teams.<br/><em>One community.</em></h1>
      <p className="lead">Meet both Seven Hills FTC teams. Each team has its own identity and team number.</p>
    </div>
    <TeamCards />
  </main>;
}
