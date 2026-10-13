"use client";

import { useRef, useState } from "react";
import { getMediaEmbedUrl } from "@/lib/media-embeds";

type Asset = { id: string; title: string; mime_type: string; alt_text: string | null; is_public: boolean };

export default function SitePageBodyEditor({ source, format, assets, allowFormat = true, sourceName = "body_markdown", helpId = "body-source-help" }: { source: string; format: "markdown" | "html"; assets: Asset[]; allowFormat?: boolean; sourceName?: string; helpId?: string }) {
  const editor = useRef<HTMLTextAreaElement>(null);
  const [currentFormat, setCurrentFormat] = useState(format);
  const [embedUrl, setEmbedUrl] = useState("");
  const [embedTitle, setEmbedTitle] = useState("Embedded video");
  const [embedMessage, setEmbedMessage] = useState("");
  const publicAssets = assets.filter(asset => asset.is_public);

  function insertSnippet(snippet: string) {
    const field = editor.current;
    if (!field) return;
    const start = field.selectionStart;
    const end = field.selectionEnd;
    const next = `${field.value.slice(0, start)}${snippet}${field.value.slice(end)}`;
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
    setter?.call(field, next);
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.focus();
    field.setSelectionRange(start + snippet.length, start + snippet.length);
  }

  function insert(asset: Asset) {
    const url = `/api/media/${asset.id}/download`;
    const plainAlt = asset.alt_text ?? "";
    const alt = currentFormat === "html" ? plainAlt.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;") : plainAlt.replace(/[\[\]\r\n]/g, " ");
    const title = asset.title.replace(/[\[\]\r\n]/g, " ");
    const snippet = asset.mime_type.startsWith("image/")
      ? currentFormat === "html" ? `<img src="${url}" alt="${alt}" />` : `![${alt}](${url})`
      : currentFormat === "html" ? `<a href="${url}">${title.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</a>` : `[${title}](${url})`;
    insertSnippet(snippet);
  }

  function insertEmbed() {
    const src = getMediaEmbedUrl(embedUrl);
    if (!src) { setEmbedMessage("Paste a supported YouTube or Vimeo video link."); return; }
    const title = embedTitle.trim().replace(/[\[\]\r\n]/g, " ") || "Embedded video";
    const snippet = currentFormat === "html"
      ? `<iframe src="${src}" title="${title.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}" loading="lazy" allowfullscreen></iframe>`
      : `@[${title}](${src})`;
    insertSnippet(snippet);
    setEmbedMessage("Video embed inserted.");
  }

  return <>
    {allowFormat && <><label>Content format<select name="body_format" value={currentFormat} onChange={event => setCurrentFormat(event.target.value as "markdown" | "html")}><option value="markdown">Markdown</option><option value="html">HTML</option></select></label><small>Switching formats keeps the text unchanged; rewrite or paste the source in the selected format.</small></>}
    <div className="media-insert-panel">
      <strong>Insert from media library</strong>
      <p>Only public files are available on the public site. Set accurate alt text on images in the media library before inserting them.</p>
      {publicAssets.length ? <div className="media-insert-list">{publicAssets.map(asset => <button key={asset.id} type="button" className="text-link" onClick={() => insert(asset)}>{asset.mime_type.startsWith("image/") ? "Image" : "File"}: {asset.title}{asset.mime_type.startsWith("image/") ? ` · alt: ${asset.alt_text || "missing"}` : ""}</button>)}</div> : <p>No public media yet. Upload a file in <a href="/admin/media">Media library</a> and mark it public.</p>}
      <div className="embed-insert"><strong>Embed a video</strong><label>Video link<input value={embedUrl} onChange={event => setEmbedUrl(event.target.value)} placeholder="https://youtu.be/… or https://vimeo.com/…"/></label><label>Accessible title<input value={embedTitle} onChange={event => setEmbedTitle(event.target.value)} maxLength={140}/></label><button type="button" className="text-button" onClick={insertEmbed}>Insert video</button>{embedMessage&&<small role="status">{embedMessage}</small>}</div>
    </div>
    <label>Page content source
      <textarea ref={editor} name={sourceName} rows={26} maxLength={100000} defaultValue={source} aria-describedby={helpId} spellCheck="false" />
    </label>
    {!allowFormat && <small id={helpId}>Markdown images use <code>![description](url)</code>; video embeds use <code>@[Accessible title](YouTube-or-Vimeo-link)</code>. Use the buttons above to insert library assets or a video embed.</small>}
  </>;
}
