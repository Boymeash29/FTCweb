import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ContentBlocks from "@/components/ContentBlocks";
import { createClient } from "@/lib/supabase/server";
import { getTeams } from "@/lib/teams";

async function getDocument(slug: string) {
  const client = await createClient();
  if (!client) return null;
  const { data } = await client.from("software_documents").select("title,slug,summary,category,body,repo_url,season_id,seasons(name,team_id)").eq("slug", slug).eq("status", "published").maybeSingle();
  return data;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const document = await getDocument(slug);
  return document ? { title: document.title, description: document.summary } : {};
}

export default async function SoftwareDocumentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [document, teams] = await Promise.all([getDocument(slug), getTeams()]);
  if (!document) notFound();
  const season = Array.isArray(document.seasons) ? document.seasons[0] : document.seasons;
  const team = teams.find(value => value.id === season?.team_id);
  return <main id="main-content"><article className="entry-detail wrap">
    <Link className="text-link" href={team?`/teams/${team.slug}/engineering`:"/software"}>← {team?`${team.name} engineering`:"Software by team"}</Link>
    <span className="section-tag">{team ? `${team.name} · TEAM ${team.number}` : "SEVEN HILLS FTC · SHARED"}{season?.name ? ` · ${season.name}` : ""} · {document.category}</span>
    <h1>{document.title}<span className="period">.</span></h1>
    <p className="entry-summary">{document.summary}</p>
    {document.repo_url && <p><a className="text-link" href={document.repo_url} target="_blank" rel="noreferrer">View source repository ↗</a></p>}
    <ContentBlocks blocks={document.body}/>
  </article></main>;
}
