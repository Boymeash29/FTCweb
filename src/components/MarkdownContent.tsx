import type { ReactNode } from "react";
import { getMarkdownHeadings } from "@/lib/markdown-headings";

function safeHref(value: string) { return (value.startsWith("/") && !value.startsWith("//")) || /^https:\/\//i.test(value); }

function inline(text: string): ReactNode[] {
  const token=/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  const output:ReactNode[]=[];let cursor=0;let match:RegExpExecArray|null;
  while(true){match=token.exec(text);if(!match)break;if(match.index>cursor)output.push(text.slice(cursor,match.index));const value=match[0];
    if(value.startsWith("`"))output.push(<code key={match.index}>{value.slice(1,-1)}</code>);
    else if(value.startsWith("**"))output.push(<strong key={match.index}>{value.slice(2,-2)}</strong>);
    else if(value.startsWith("*"))output.push(<em key={match.index}>{value.slice(1,-1)}</em>);
    else {const link=/^\[([^\]]+)\]\(([^)]+)\)$/.exec(value);if(link&&safeHref(link[2]))output.push(<a key={match.index} href={link[2]}>{link[1]}</a>);else output.push(value);}
    cursor=match.index+value.length;
  }
  if(cursor<text.length)output.push(text.slice(cursor));return output;
}

function startsBlock(line:string){return /^\s*(#{1,6}\s|```|>\s?|[-*+]\s|\d+\.\s|---+$)/.test(line);}

export default function MarkdownContent({ source }: { source: string }) {
  const lines=source.replace(/\r\n?/g,"\n").split("\n");const blocks:ReactNode[]=[];let index=0;
  const headingIds = new Map(getMarkdownHeadings(source).map(heading => [heading.line, heading.id]));
  while(index<lines.length){const line=lines[index];if(!line.trim()){index++;continue;}
    if(line.startsWith("```")){const language=line.slice(3).trim();index++;const code:string[]=[];while(index<lines.length&&!lines[index].startsWith("```"))code.push(lines[index++]);if(index<lines.length)index++;blocks.push(<pre key={blocks.length} data-language={language||undefined}><code>{code.join("\n")}</code></pre>);continue;}
    const heading=/^(#{1,6})\s+(.+)$/.exec(line);if(heading){const level=Math.min(heading[1].length+1,6);const children=inline(heading[2]);const id=headingIds.get(index);blocks.push(level===2?<h2 id={id} key={blocks.length}>{children}</h2>:level===3?<h3 id={id} key={blocks.length}>{children}</h3>:<h4 id={id} key={blocks.length}>{children}</h4>);index++;continue;}
    if(/^---+$/.test(line.trim())){blocks.push(<hr key={blocks.length}/>);index++;continue;}
    if(/^\s*>/.test(line)){const quote:string[]=[];while(index<lines.length&&/^\s*>/.test(lines[index]))quote.push(lines[index++].replace(/^\s*>\s?/,""));blocks.push(<blockquote key={blocks.length}><p>{inline(quote.join(" "))}</p></blockquote>);continue;}
    if(/^\s*[-*+]\s/.test(line)||/^\s*\d+\.\s/.test(line)){const ordered=/^\s*\d+\.\s/.test(line);const items:string[]=[];while(index<lines.length&&(/^\s*[-*+]\s/.test(lines[index])||/^\s*\d+\.\s/.test(lines[index]))){items.push(lines[index++].replace(/^\s*(?:[-*+]|\d+\.)\s/,""));}const occurrences=new Map<string,number>();const keyedItems=items.map(item=>{const count=occurrences.get(item)??0;occurrences.set(item,count+1);return {item,key:`${item}-${count}`};});blocks.push(ordered?<ol key={blocks.length}>{keyedItems.map(({item,key})=><li key={key}>{inline(item)}</li>)}</ol>:<ul key={blocks.length}>{keyedItems.map(({item,key})=><li key={key}>{inline(item)}</li>)}</ul>);continue;}
    const paragraph=[line.trim()];index++;while(index<lines.length&&lines[index].trim()&&!startsBlock(lines[index]))paragraph.push(lines[index++].trim());blocks.push(<p key={blocks.length}>{inline(paragraph.join(" "))}</p>);
  }
  return <div className="rich-content site-markdown">{blocks}</div>;
}
