import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import PageFrame from "@/components/PageFrame";
import { pages } from "@/lib/content";
import { getSitePage } from "@/lib/site-pages";
import TeamOutreachDirectory from "@/components/TeamOutreachDirectory";
import TeamSponsorDirectory from "@/components/TeamSponsorDirectory";

export function generateStaticParams() { return Object.keys(pages).map(slug => ({slug})); }
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata> { const {slug}=await params; const page=pages[slug]; if(!page)return {}; const saved=await getSitePage(slug); return {title:saved.title,description:saved.intro}; }
export default async function GenericPage({params}:{params:Promise<{slug:string}>}) { const {slug}=await params; if(slug==="team")redirect("/teams"); const page=pages[slug]; if(!page)notFound(); if(slug==="outreach")return <main id="main-content"><PageFrame pageKey={slug} asMain={false}/><TeamOutreachDirectory/></main>; if(slug==="sponsors")return <main id="main-content"><PageFrame pageKey={slug} asMain={false}/><TeamSponsorDirectory/></main>; return <PageFrame pageKey={slug}/>; }
