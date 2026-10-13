const videoId = /^[A-Za-z0-9_-]{6,20}$/;

export function getMediaEmbedUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase();
    let id = "";
    if (host === "youtu.be") id = url.pathname.split("/").filter(Boolean)[0] ?? "";
    else if (host === "youtube.com" || host === "www.youtube.com" || host === "m.youtube.com") {
      const parts = url.pathname.split("/").filter(Boolean);
      id = url.pathname === "/watch" ? url.searchParams.get("v") ?? "" : ["embed", "shorts", "live"].includes(parts[0] ?? "") ? parts[1] ?? "" : "";
    } else if (host === "youtube-nocookie.com" || host === "www.youtube-nocookie.com") {
      const parts = url.pathname.split("/").filter(Boolean);
      id = parts[0] === "embed" ? parts[1] ?? "" : "";
    } else if (host === "vimeo.com" || host === "www.vimeo.com") {
      id = url.pathname.split("/").filter(Boolean)[0] ?? "";
      if (/^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
      return null;
    } else if (host === "player.vimeo.com") {
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts[0] === "video" && /^\d+$/.test(parts[1] ?? "")) return `https://player.vimeo.com/video/${parts[1]}`;
      return null;
    }
    return videoId.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  } catch {
    return null;
  }
}
