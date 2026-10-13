import { redirect } from "next/navigation";
import { createClient, getCmsUser } from "@/lib/supabase/server";
import MediaUploader from "@/components/MediaUploader";

export const metadata = { title: "Media library", robots: { index: false, follow: false } };
function formatBytes(value: number) { return value < 1024 * 1024 ? `${Math.max(1, Math.round(value / 1024))} KB` : `${(value / 1024 / 1024).toFixed(1)} MB`; }
export default async function MediaPage() {
  const user = await getCmsUser();
  if (!user) redirect("/admin/login?error=access");
  const client = await createClient();
  if (!client) redirect("/admin/login?error=setup");
  const [{ data: assets }, { data: seasons }] = await Promise.all([
    client.from("media_assets").select("id,title,mime_type,byte_size,width,height,alt_text,creator_credit,is_public,created_at").order("created_at", { ascending: false }).limit(100),
    client.from("seasons").select("id,name").order("name")
  ]);
  return <main id="main-content" className="admin-shell"><section className="admin-dashboard">
    <div className="admin-top"><div><span className="section-tag">TEAM CMS / MEDIA</span><h1>Media library<span className="period">.</span></h1><p><a href="/admin">← Back to content</a></p></div></div>
    <div className="admin-content-grid media-grid"><section className="admin-panel"><span className="section-tag">UPLOAD</span><h2>Add files</h2><p className="admin-empty">Upload progress and file metadata are saved here; binary files go to the configured R2 bucket.</p><MediaUploader seasons={seasons ?? []} isAdmin={user.role === "admin"}/></section>
      <section className="admin-panel"><span className="section-tag">STORAGE SETUP</span><h2>Private by default</h2><p className="admin-empty">Configure R2 credentials in the server environment and allow this site origin in bucket CORS. Public files use short-lived signed delivery links, so the bucket can stay private. A Cloudflare custom domain in R2_PUBLIC_BASE_URL is optional. Never put storage access keys in browser variables.</p><p className="admin-empty">Supported files are limited to 100 MB per upload. Object replacement and deletion safeguards are not yet implemented.</p></section>
    </div>
    <section className="admin-panel media-list"><span className="section-tag">LIBRARY</span><h2>Recent assets</h2>{assets?.length ? assets.map(asset=><article className="media-row" key={asset.id}><div className="media-kind">{asset.mime_type.startsWith("image/") ? "IMG" : asset.mime_type === "application/pdf" ? "PDF" : "FILE"}</div><div className="media-info"><b>{asset.title}</b><small>{asset.mime_type} · {formatBytes(asset.byte_size)}{asset.width && asset.height ? ` · ${asset.width}×${asset.height}` : ""}</small>{asset.alt_text && <small>Alt: {asset.alt_text}</small>}{asset.creator_credit && <small>Credit: {asset.creator_credit}</small>}</div><span className={asset.is_public ? "active-label" : "inactive-label"}>{asset.is_public ? "PUBLIC" : "PRIVATE"}</span><a href={`/api/media/${asset.id}/download`} target="_blank" rel="noreferrer">Open ↗</a></article>) : <p className="admin-empty">No media has been uploaded.</p>}</section>
  </section></main>;
}
