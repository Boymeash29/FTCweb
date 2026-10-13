import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import SitePageHeading from "@/components/SitePageHeading";
import { getSitePage } from "@/lib/site-pages";
export async function generateMetadata(){const page=await getSitePage("mechanisms");return {title:page.title,description:page.intro};}
export default async function MechanismsPage(){const client=await createClient();const {data}=client?await client.from("mechanisms").select("name,slug,purpose,season_id").eq("status","published").order("sort_order"): {data:null};return <main id="main-content"><SitePageHeading pageKey="mechanisms"/><section className="entry-feed wrap">{data?.length?<div className="entry-feed-grid">{data.map(item=><Link className="entry-feed-card" href={`/mechanisms/${item.slug}`} key={item.slug}><span>SEASON-LINKED DOCUMENTATION</span><h2>{item.name}</h2><p>{item.purpose}</p><b>View mechanism <ArrowUpRight size={15}/></b></Link>)}</div>:<div className="entry-feed-empty"><span className="section-tag">HARDWARE</span><h2>No mechanisms published yet.</h2><p>Mechanism names and technical details will appear after the team documents and approves them.</p></div>}</section></main>;}
