export type MarkdownHeading = { level: number; title: string; id: string; line: number };

function plainHeadingText(value: string) {
  return value
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*|__|\*|_|~~/g, "")
    .trim();
}

function headingSlug(value: string) {
  return plainHeadingText(value)
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "section";
}

export function getMarkdownHeadings(source: string): MarkdownHeading[] {
  const headings: MarkdownHeading[] = [];
  const counts = new Map<string, number>();
  let insideCodeFence = false;

  source.split(/\r?\n/).forEach((line, lineNumber) => {
    if (/^\s*```/.test(line)) {
      insideCodeFence = !insideCodeFence;
      return;
    }
    if (insideCodeFence) return;

    const match = /^(#{1,6})\s+(.+)$/.exec(line);
    if (!match) return;

    const title = plainHeadingText(match[2]);
    const slug = headingSlug(title);
    const occurrence = counts.get(slug) ?? 0;
    counts.set(slug, occurrence + 1);
    headings.push({
      level: match[1].length,
      title,
      id: occurrence ? `${slug}-${occurrence + 1}` : slug,
      line: lineNumber
    });
  });

  return headings;
}
