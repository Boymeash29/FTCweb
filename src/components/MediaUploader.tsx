"use client";
import { useRef, useState } from "react";
import { recordMediaAsset } from "@/app/admin/actions";

type SeasonOption = { id: string; name: string; teamName?: string };
type SignedUpload = { uploadUrl: string; objectKey: string; contentType: string };

export default function MediaUploader({ seasons, isAdmin }: { seasons: SeasonOption[]; isAdmin: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState(0);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  async function upload(file: File, url: string, contentType: string) {
    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", url);
      xhr.setRequestHeader("Content-Type", contentType);
      xhr.upload.onprogress = event => { if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 100)); };
      xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Storage returned ${xhr.status}. Check the R2 bucket CORS settings.`));
      xhr.onerror = () => reject(new Error("Upload failed. Check the connection and R2 CORS configuration."));
      xhr.send(file);
    });
  }

  async function submit(formData: FormData) {
    const file = fileRef.current?.files?.[0];
    if (!file) { setError(true); setMessage("Choose a file first."); return; }
    setWorking(true); setError(false); setMessage("Preparing secure upload…"); setProgress(0);
    try {
      const response = await fetch("/api/media/sign-upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: file.name, size: file.size, type: file.type || "application/octet-stream" }) });
      const signed = await response.json() as SignedUpload & { error?: string };
      if (!response.ok) throw new Error(signed.error ?? "Could not prepare the upload.");
      await upload(file, signed.uploadUrl, signed.contentType);
      setMessage("Saving media details…");
      const dimensions = file.type.startsWith("image/") ? await createImageBitmap(file).then(image => { const result = { width: image.width, height: image.height }; image.close(); return result; }).catch(() => ({ width: 0, height: 0 })) : { width: 0, height: 0 };
      const metadata = new FormData();
      for (const key of ["title", "caption", "alt_text", "creator_credit", "season_id"]) metadata.set(key, String(formData.get(key) ?? ""));
      metadata.set("is_public", formData.has("is_public") ? "true" : "false");
      metadata.set("object_key", signed.objectKey); metadata.set("mime_type", signed.contentType); metadata.set("byte_size", String(file.size));
      metadata.set("width", String(dimensions.width)); metadata.set("height", String(dimensions.height));
      const result = await recordMediaAsset(metadata);
      setError(!result.ok); setMessage(result.message);
      if (result.ok) { if (fileRef.current) fileRef.current.value = ""; setProgress(100); }
    } catch (exception) {
      setError(true); setMessage(exception instanceof Error ? exception.message : "Upload failed.");
    } finally { setWorking(false); }
  }

  return <form action={submit} className="entry-form media-uploader">
    <label>File<input ref={fileRef} type="file" required accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,video/mp4,video/webm,application/zip,application/octet-stream,model/stl,model/obj,.step,.stp,.stl,.obj,.3mf,.dxf"/></label>
    <label>Title<input name="title" required maxLength={160} placeholder="Descriptive file title"/></label>
    <label>Season<select name="season_id"><option value="">Not season-specific</option>{seasons.map(season=><option key={season.id} value={season.id}>{season.name}{season.teamName ? ` · ${season.teamName}` : ""}</option>)}</select></label>
    <label>Caption<textarea name="caption" rows={2} maxLength={500}/></label>
    <label>Alt text<textarea name="alt_text" rows={2} maxLength={500} placeholder="Describe meaningful image content"/></label>
    <label>Photographer / creator credit<input name="creator_credit" maxLength={160}/></label>
    {isAdmin && <label className="checkbox-label"><input type="checkbox" name="is_public" value="true"/> Make this file publicly accessible (requires R2 public domain setup)</label>}
    <button className="button-link" type="submit" disabled={working}>{working ? "Uploading…" : "Upload media"} <span>→</span></button>
    {working && <progress max={100} value={progress} aria-label="Media upload progress"/>}
    {message && <p className={error ? "form-error" : "notice-success"} role="status">{message}</p>}
    <small>Maximum 100 MB. Supported: images, PDFs, MP4/WebM video, ZIP, and common STEP/STL/OBJ/3MF/DXF CAD exports. Files are private unless an admin explicitly marks them public.</small>
  </form>;
}
