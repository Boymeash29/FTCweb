import { redirect } from "next/navigation";
import { createClient, getCmsUser } from "@/lib/supabase/server";

export const metadata={title:"Mechanism pages",robots:{index:false,follow:false}};
export default async function AdminMechanisms({searchParams}:{searchParams:Promise<{error?:string}>}){
 const user=await getCmsUser();if(user?.role!=="admin")redirect("/admin/login?error=access");
 const client=await createClient();if(!client)redirect("/admin/login?error=setup");
 const {data}=await client.from("mechanisms").select("name,slug,purpose,status,updated_at").order("sort_order");const {error}=await searchParams;
 return <main id="main-content" className="admin-shell"><section className="admin-dashboard"><div className="admin-top"><div><span className="section-tag">TEAM CMS / MECHANISMS</span><h1>Mechanism pages<span className="period">.</span></h1><p><a href="/admin">← Dashboard</a></p></div></div>{error&&<div role="alert" className="form-error">The mechanism could not be saved. Check its fields and try again.</div>}<section className="admin-panel"><div className="entry-list">{data?.length?data.map(item=><div className="entry-row" key={item.slug}><span className="entry-type">{item.status}</span><b>{item.name}</b><small>{item.slug}</small><a href={`/admin/mechanisms/${item.slug}`}>Edit ↗</a></div>):<p className="admin-empty">No mechanism records have been created yet. The mechanisms list page copy is editable under Site Pages.</p>}</div></section></section></main>;
}
