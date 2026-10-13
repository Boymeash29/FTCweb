import Link from "next/link";

type Block =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "quote"; text: string; attribution?: string }
  | { type: "code"; language: string; code: string }
  | { type: "link"; label: string; href: string };

export default function ContentBlocks({ blocks }: { blocks: unknown }) {
  if (!Array.isArray(blocks)) return null;
  const seen = new Map<string, number>();
  return <div className="rich-content">{(blocks as Block[]).map(block => {
    const signature = JSON.stringify(block);
    const occurrence = seen.get(signature) ?? 0;
    seen.set(signature, occurrence + 1);
    const key = `${signature}-${occurrence}`;
    if (block.type === "heading") return <h2 key={key}>{block.text}</h2>;
    if (block.type === "paragraph") return <p key={key}>{block.text}</p>;
    if (block.type === "list") {
      const itemsSeen = new Map<string, number>();
      return <ul key={key}>{block.items.map(item => { const count = itemsSeen.get(item) ?? 0; itemsSeen.set(item, count + 1); return <li key={`${item}-${count}`}>{item}</li>; })}</ul>;
    }
    if (block.type === "quote") return <blockquote key={key}><p>{block.text}</p>{block.attribution && <cite>{block.attribution}</cite>}</blockquote>;
    if (block.type === "code") return <pre key={key} data-language={block.language}><code>{block.code}</code></pre>;
    if (block.type === "link") return <p key={key}><Link href={block.href} target="_blank" rel="noopener noreferrer" className="text-link">{block.label} ↗</Link></p>;
    return null;
  })}</div>;
}
