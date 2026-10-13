import { notFound, redirect } from "next/navigation";
import { createClient, getCmsUser } from "@/lib/supabase/server";
import ContentBlocks from "@/components/ContentBlocks";
import MarkdownContent from "@/components/MarkdownContent";

export const metadata = { title: "Content preview", robots: { index: false, follow: false } };
export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  if (!await getCmsUser()) redirect("/admin/login?error=access");
  const { id } = await params;
  const client = await createClient();
  if (!client) redirect("/admin/login?error=setup");
  const { data } = await client.from("content_entries").select("title,summary,body,body_markdown,status,type,published_at").eq("id", id).maybeSingle();
  if (!data) notFound();
  return <main id="main-content"><article className="entry-detail wrap"><a className="text-link" href={`/admin/content/${id}`}>← Edit draft</a><span className="section-tag">PREVIEW · {data.status.toUpperCase()}</span><h1>{data.title}<span className="period">.</span></h1><p className="entry-summary">{data.summary}</p>{data.body_markdown?<MarkdownContent source={data.body_markdown}/>:<ContentBlocks blocks={data.body}/>}</article></main>;
}
