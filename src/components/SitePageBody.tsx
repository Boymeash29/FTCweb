import MarkdownContent from "@/components/MarkdownContent";
import SafeHtmlContent from "@/components/SafeHtmlContent";

export default function SitePageBody({ source, format }: { source: string; format?: "markdown" | "html" }) {
  return format === "html" ? <SafeHtmlContent source={source}/> : <MarkdownContent source={source}/>;
}
