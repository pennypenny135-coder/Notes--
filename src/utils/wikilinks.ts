// Extract [[Wiki Links]] from markdown content

export interface WikiLinkMatch {
  title: string;
  context: string;
}

export function extractWikiLinks(content: string): WikiLinkMatch[] {
  const regex = /\[\[([^\]]+)\]\]/g;
  const results: WikiLinkMatch[] = [];
  const seen = new Set<string>();
  let match;
  while ((match = regex.exec(content)) !== null) {
    const title = match[1].trim();
    if (!seen.has(title.toLowerCase())) {
      seen.add(title.toLowerCase());
      // Get surrounding context (up to 80 chars)
      const start = Math.max(0, match.index - 40);
      const end = Math.min(content.length, match.index + match[0].length + 40);
      const context = content.slice(start, end).replace(/\n/g, ' ').trim();
      results.push({ title, context });
    }
  }
  return results;
}

// Replace [[Title]] with rendered link in markdown
export function renderWikiLinks(
  content: string,
  resolver: (title: string) => string | null
): string {
  return content.replace(/\[\[([^\]]+)\]\]/g, (_, title) => {
    const id = resolver(title.trim());
    if (id) {
      return `<span class="wiki-link" data-note-id="${id}" data-title="${title.trim()}">${title.trim()}</span>`;
    }
    return `<span class="wiki-link wiki-link-missing" data-title="${title.trim()}">${title.trim()}</span>`;
  });
}
