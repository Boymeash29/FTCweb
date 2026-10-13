import { notFound, redirect } from "next/navigation";
import { createClient, getCmsUser } from "@/lib/supabase/server";

export default async function EditEntryBySlug({params}:{params:Promise<{slug:string}>}){
 const user=await getCmsUser();if(user?.role!=="admin")redirect("/admin/login?error=access");
 const {slug}=await params;const client=await createClient();if(!client)redirect("/admin/login?error=setup");
 const {data}=await client.from("content_entries").select("id").eq("slug",slug).maybeSingle();if(!data)notFound();
 redirect(`/admin/content/${data.id}`);
}
