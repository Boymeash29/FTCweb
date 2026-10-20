import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ContentBlocks from "@/components/ContentBlocks";
import { createClient } from "@/lib/supabase/server";
import { getTeams } from "@/lib/teams";

async function getProject(slug: string) {
  const client = await createClient();
  if (!client) return null;
  const { data } = await client.from("engineering_projects").select("title,slug,summary,body,season_id,seasons(name,slug,team_id)").eq("slug", slug).eq("status", "published").maybeSingle();
  return data;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProject(slug);
  return project ? { title: project.title, description: project.summary } : {};
}

export default async function EngineeringProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [project, teams] = await Promise.all([getProject(slug), getTeams()]);
  if (!project) notFound();
  const season = Array.isArray(project.seasons) ? project.seasons[0] : project.seasons;
  const team = teams.find(value => value.id === season?.team_id);
  return <main id="main-content"><article className="entry-detail wrap">
    <Link className="text-link" href={team?`/teams/${team.slug}/engineering`:"/engineering"}>← {team?`${team.name} portfolio`:"Engineering portfolio"}</Link>
    <span className="section-tag">{team ? `${team.name} · TEAM ${team.number}` : "SEVEN HILLS FTC · SHARED"}{season?.name ? ` · ${season.name}` : ""}</span>
    <h1>{project.title}<span className="period">.</span></h1>
    <p className="entry-summary">{project.summary}</p>
    <ContentBlocks blocks={project.body}/>
  </article></main>;
}
