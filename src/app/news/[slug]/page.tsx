import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ContentBlocks from "@/components/ContentBlocks";
import MarkdownContent from "@/components/MarkdownContent";
import type { Metadata } from "next";
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{const {slug}=await params;const client=await createClient();const {data}=client?await client.from("published_content_entries").select("title,summary").eq("slug",slug).eq("type","news").maybeSingle():{data:null};return data?{title:data.title,description:data.summary}:{};}
export default async function NewsEntry({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const supabase=await createClient();const {data}=supabase?await supabase.from("published_content_entries").select("title,summary,body,body_markdown,published_at,type").eq("slug",slug).eq("type","news").maybeSingle():{data:null};if(!data)notFound();return <main id="main-content"><article className="entry-detail wrap"><Link className="text-link" href="/news">← All news</Link><span className="section-tag">TEAM NEWS</span><h1>{data.title}<span className="period">.</span></h1>{data.published_at&&<time dateTime={data.published_at}>{new Date(data.published_at).toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})}</time>}<p className="entry-summary">{data.summary}</p>{data.body_markdown?<MarkdownContent source={data.body_markdown}/>:<ContentBlocks blocks={data.body}/>}</article></main>;}
