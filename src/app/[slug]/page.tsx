import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import PageFrame from "@/components/PageFrame";
import { pages } from "@/lib/content";
import { getSitePage } from "@/lib/site-pages";

export function generateStaticParams() { return Object.keys(pages).map(slug => ({slug})); }
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata> { const {slug}=await params; const page=pages[slug]; if(!page)return {}; const saved=await getSitePage(slug); return {title:saved.title,description:saved.intro}; }
export default async function GenericPage({params}:{params:Promise<{slug:string}>}) { const {slug}=await params; if(slug==="team")redirect("/teams"); const page=pages[slug]; if(!page)notFound(); return <PageFrame pageKey={slug}/>; }
