import { redirect } from "next/navigation";
import { createClient, getCmsUser } from "@/lib/supabase/server";

export const metadata={title:"Mechanism pages",robots:{index:false,follow:false}};
export default async function AdminMechanisms({searchParams}:{searchParams:Promise<{error?:string}>}){
 const user=await getCmsUser();if(user?.role!=="admin")redirect("/admin/login?error=access");
 const client=await createClient();if(!client)redirect("/admin/login?error=setup");
 const [{data},{data:seasons},{data:teams}]=await Promise.all([client.from("mechanisms").select("name,slug,purpose,status,updated_at,season_id").order("sort_order"),client.from("seasons").select("id,name,team_id").order("start_date",{ascending:false,nullsFirst:false}),client.from("teams").select("id,name,number").order("sort_order")]);const {error}=await searchParams;
 const seasonById=new Map((seasons??[]).map(season=>[season.id,season]));
 return <main id="main-content" className="admin-shell"><section className="admin-dashboard"><div className="admin-top"><div><span className="section-tag">TEAM CMS / MECHANISMS</span><h1>Mechanism pages<span className="period">.</span></h1><p><a href="/admin">← Dashboard</a></p></div></div>{error&&<div role="alert" className="form-error">The mechanism could not be saved. Check its fields and try again.</div>}<section className="admin-panel"><div className="entry-list">{data?.length?data.map(item=>{const season=seasonById.get(item.season_id);const team=teams?.find(value=>value.id===season?.team_id);return <div className="entry-row" key={item.slug}><span className="entry-type">{item.status}</span><b>{item.name}</b><small>{team?`${team.name} · `:"Shared · "}{season?.name??"Season"}</small><a href={`/admin/mechanisms/${item.slug}`}>Edit ↗</a></div>}):<p className="admin-empty">No mechanism records have been created yet. The mechanisms list page copy is editable under Site Pages.</p>}</div></section></section></main>;
}
