import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getTeams } from "@/lib/teams";

export default async function EntryFeed({type,title}:{type:"news"|"journal"|"project";title:string}){
 const supabase=await createClient();
 const [{data,error},teams]=await Promise.all([supabase?supabase.from("published_content_entries").select("title,slug,summary,published_at,team_id").eq("type",type).order("published_at",{ascending:false}):Promise.resolve({data:null,error:null}),getTeams()]);
 const basePath=type==="project"?"projects":type;
 const renderEntries=(items:NonNullable<typeof data>)=>items.length?<div className="entry-feed-grid">{items.map(entry=><Link key={entry.slug} href={`/${basePath}/${entry.slug}`} className="entry-feed-card"><span>{entry.published_at?new Date(entry.published_at).toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"}):""}</span><h2>{entry.title}</h2><p>{entry.summary}</p><b>Read entry <ArrowUpRight size={15}/></b></Link>)}</div>:<p className="team-profile-empty">{error?"This section is temporarily unavailable.":`No ${title.toLowerCase()} published for this team yet.`}</p>;
 return <section className="team-work-directory wrap" aria-label={`${title} by team`}>{teams.map(team=>{const items=(data??[]).filter(entry=>entry.team_id===team.id);return <section className="team-work-group" key={team.slug}><header><span className="section-tag">TEAM {team.number}</span><h2>{team.name}<span className="period">.</span></h2></header>{renderEntries(items)}</section>})}{(data??[]).some(entry=>!entry.team_id)&&<section className="team-work-group"><header><span className="section-tag">SEVEN HILLS FTC · SHARED</span><h2>Shared {title.toLowerCase()}<span className="period">.</span></h2></header>{renderEntries((data??[]).filter(entry=>!entry.team_id))}</section>}{!supabase&&<div className="entry-feed-empty"><h2>Content publishing is not connected yet.</h2><p>Connect the team CMS to publish approved updates.</p></div>}</section>;
}
