import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getTeams } from "@/lib/teams";
import SitePageHeading from "@/components/SitePageHeading";
import { getSitePage } from "@/lib/site-pages";
export async function generateMetadata(){const page=await getSitePage("mechanisms");return {title:page.title,description:page.intro};}
export default async function MechanismsPage(){
 const client=await createClient();
 const [{data}, {data:seasons}, teams]=await Promise.all([client?client.from("mechanisms").select("name,slug,purpose,season_id").eq("status","published").order("sort_order"):Promise.resolve({data:null}),client?client.from("seasons").select("id,name,team_id").eq("status","published"):Promise.resolve({data:null}),getTeams()]);
 const seasonById=new Map((seasons??[]).map(season=>[season.id,season]));
 return <main id="main-content"><SitePageHeading pageKey="mechanisms"/><section className="entry-feed wrap">{data?.length?<div className="entry-feed-grid">{data.map(item=>{const season=seasonById.get(item.season_id);const team=teams.find(value=>value.id===season?.team_id);return <Link className="entry-feed-card" href={`/mechanisms/${item.slug}`} key={item.slug}><span>{team?`${team.name} · ${team.number}`:"SEVEN HILLS FTC · SHARED"}{season?` · ${season.name}`:""}</span><h2>{item.name}</h2><p>{item.purpose}</p><b>View mechanism <ArrowUpRight size={15}/></b></Link>})}</div>:<div className="entry-feed-empty"><span className="section-tag">HARDWARE</span><h2>No mechanisms published yet.</h2><p>Mechanism names and technical details will appear here after they are connected to a team and season.</p></div>}</section></main>;
}
