import { createElement, type ReactNode } from "react";
import { getMediaEmbedUrl } from "@/lib/media-embeds";

type HtmlNode = { tag?: string; text?: string; attrs?: Record<string, string | boolean>; children: HtmlNode[] };
const allowed = new Set("a abbr b blockquote br caption code dd del details div dl dt em figcaption figure h1 h2 h3 h4 h5 h6 hr i iframe img li ol p picture pre s small source span strong sub summary sup table tbody td tfoot th thead tr u ul video audio".split(" "));
const voidTags = new Set(["br", "hr", "iframe", "img", "source"]);
const blockedTags = new Set(["script", "style", "object", "embed", "form", "input", "button", "textarea", "select", "svg", "math"]);
const allowedAttrs = new Set(["alt", "class", "colspan", "controls", "height", "href", "id", "loading", "loop", "muted", "poster", "preload", "rowspan", "scope", "src", "title", "width"]);

function safeUrl(value: string) {
  const url = value.trim();
  return (url.startsWith("/") && !url.startsWith("//")) || /^https:\/\//i.test(url) || /^(mailto|tel):/i.test(url);
}
function slug(value: string) { return value.toLocaleLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "section"; }
function decode(value: string) {
  return value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (entity, name: string) => {
    if (name[0] === "#") { const code = name[1]?.toLowerCase() === "x" ? Number.parseInt(name.slice(2), 16) : Number.parseInt(name.slice(1), 10); return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : ""; }
    return ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: "\u00a0" } as Record<string, string>)[name.toLowerCase()] ?? entity;
  });
}

function parse(source: string): HtmlNode[] {
  const root: HtmlNode = { children: [] };
  const stack = [root];
  let blocked: { tag: string; depth: number } | null = null;
  const tokens = source.match(/<!--[\s\S]*?-->|<[^>]*>|[^<]+|</g) ?? [];
  for (const token of tokens) {
    if (token.startsWith("<!--")) continue;
    const close = /^<\s*\/\s*([a-z0-9-]+)[^>]*>$/i.exec(token);
    const open = /^<\s*([a-z0-9-]+)([^>]*)>$/i.exec(token);
    if (blocked) {
      if (open?.[1].toLowerCase() === blocked.tag) blocked.depth++;
      if (close?.[1].toLowerCase() === blocked.tag && --blocked.depth === 0) blocked = null;
      continue;
    }
    if (close) {
      const tag = close[1].toLowerCase();
      const position = stack.map(node => node.tag).lastIndexOf(tag);
      if (position > 0) stack.length = position;
      continue;
    }
    if (!open) { if (token) stack.at(-1)?.children.push({ text: decode(token), children: [] }); continue; }
    const tag = open[1].toLowerCase();
    if (blockedTags.has(tag)) { if (!/\/\s*>$/.test(token)) blocked = { tag, depth: 1 }; continue; }
    if (!allowed.has(tag)) continue;
    const attrs: Record<string, string | boolean> = {};
    const rawAttrs = open[2].replace(/\/\s*$/, "");
    const attrPattern = /([a-zA-Z][\w:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
    let attr: RegExpExecArray | null;
    while ((attr = attrPattern.exec(rawAttrs))) {
      const key = attr[1].toLowerCase();
      const value = decode(attr[2] ?? attr[3] ?? attr[4] ?? "").trim();
      if (!allowedAttrs.has(key) || key.startsWith("on")) continue;
      if ((key === "href" || key === "src" || key === "poster") && !safeUrl(value)) continue;
      if ((key === "src" || key === "poster") && /^(mailto|tel):/i.test(value)) continue;
      if (key === "class") attrs.className = value;
      else if (key === "colspan") attrs.colSpan = value;
      else if (key === "rowspan") attrs.rowSpan = value;
      else attrs[key] = value;
    }
    if (tag === "iframe") {
      const embedUrl = getMediaEmbedUrl(typeof attrs.src === "string" ? attrs.src : "");
      if (!embedUrl) { if (!/\/\s*>$/.test(token)) blocked = { tag, depth: 1 }; continue; }
      attrs.src = embedUrl;
      attrs.title = attrs.title || "Embedded video";
      attrs.sandbox = "allow-scripts allow-same-origin allow-presentation";
      attrs.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
      attrs.allowFullScreen = true;
      attrs.loading = "lazy";
      attrs.referrerPolicy = "strict-origin-when-cross-origin";
    }
    if ((tag === "img" || tag === "source" || tag === "video" || tag === "audio") && !attrs.src && !attrs.poster) continue;
    const node: HtmlNode = { tag, attrs, children: [] };
    stack.at(-1)?.children.push(node);
    if (!voidTags.has(tag) && !/\/\s*>$/.test(token)) stack.push(node);
  }
  const counts = new Map<string, number>();
  function addHeadingIds(nodes: HtmlNode[]) {
    for (const node of nodes) {
      if (node.tag && /^h[1-6]$/.test(node.tag) && !node.attrs?.id) {
        const title = textContent(node).trim(); const base = slug(title); const count = counts.get(base) ?? 0;
        counts.set(base, count + 1); node.attrs = { ...node.attrs, id: count ? `${base}-${count + 1}` : base };
      }
      addHeadingIds(node.children);
    }
  }
  addHeadingIds(root.children);
  return root.children;
}
function textContent(node: HtmlNode): string { return node.text ?? node.children.map(textContent).join(""); }
function render(nodes: HtmlNode[], path = "root"): ReactNode[] {
  return nodes.map((node, index) => node.tag ? createElement(node.tag, { ...node.attrs, key: `${path}-${index}` }, ...(voidTags.has(node.tag) ? [] : render(node.children, `${path}-${index}`))) : node.text);
}
export function getHtmlHeadings(source: string) {
  return parse(source).filter(node => node.tag === "h2").map(node => ({ title: textContent(node).trim(), id: node.attrs?.id ?? "section" })).filter(node => node.title && node.title.toLocaleLowerCase() !== "explore more");
}
export default function SafeHtmlContent({ source }: { source: string }) {
  return <div className="rich-content site-markdown">{render(parse(source))}</div>;
}
