import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function EntryFeed({type,title}:{type:"news"|"journal"|"project";title:string}){
 const supabase=await createClient();
 const {data,error}=supabase?await supabase.from("published_content_entries").select("title,slug,summary,published_at").eq("type",type).order("published_at",{ascending:false}):{data:null,error:null};
 const basePath=type==="project"?"projects":type;
 return <section className="entry-feed wrap">{data?.length?<div className="entry-feed-grid">{data.map(entry=><Link key={entry.slug} href={`/${basePath}/${entry.slug}`} className="entry-feed-card"><span>{entry.published_at?new Date(entry.published_at).toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"}):""}</span><h2>{entry.title}</h2><p>{entry.summary}</p><b>Read entry <ArrowUpRight size={15}/></b></Link>)}</div>:<div className="entry-feed-empty"><span className="section-tag">{title.toUpperCase()}</span><h2>{error?"Entries are temporarily unavailable.":supabase?"No entries published yet.":"Content publishing is not connected yet."}</h2><p>{error?"The content service could not be reached. Please try again later.":supabase?"Approved updates will appear here after an editor publishes them.":"The public site can be previewed now; connect the team CMS to publish updates."}</p></div>}</section>;
}
