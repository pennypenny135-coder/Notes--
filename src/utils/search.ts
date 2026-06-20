import Fuse from 'fuse.js';
import type { Note, Tag } from '../types';

// Parse structured search query: tag:xxx title:xxx content:xxx
export interface ParsedQuery {
  raw: string;
  tag?: string;
  title?: string;
  content?: string;
  general: string;
}

export function parseQuery(query: string): ParsedQuery {
  const result: ParsedQuery = { raw: query, general: '' };
  let remaining = query;

  const tagMatch = remaining.match(/\btag:(\S+)/i);
  if (tagMatch) { result.tag = tagMatch[1]; remaining = remaining.replace(tagMatch[0], '').trim(); }

  const titleMatch = remaining.match(/\btitle:(\S+)/i);
  if (titleMatch) { result.title = titleMatch[1]; remaining = remaining.replace(titleMatch[0], '').trim(); }

  const contentMatch = remaining.match(/\bcontent:(\S+)/i);
  if (contentMatch) { result.content = contentMatch[1]; remaining = remaining.replace(contentMatch[0], '').trim(); }

  result.general = remaining.trim();
  return result;
}

export function searchNotes(
  notes: Note[],
  tags: Tag[],
  query: string
): Note[] {
  if (!query.trim()) return notes;

  const parsed = parseQuery(query);

  let filtered = notes;

  // Structured filters
  if (parsed.tag) {
    const tagName = parsed.tag.toLowerCase();
    const matchedTagIds = tags
      .filter(t => t.name.toLowerCase().includes(tagName))
      .map(t => t.id);
    filtered = filtered.filter(n => n.tags.some(tid => matchedTagIds.includes(tid)));
  }

  if (parsed.title) {
    const q = parsed.title.toLowerCase();
    filtered = filtered.filter(n => n.title.toLowerCase().includes(q));
  }

  if (parsed.content) {
    const q = parsed.content.toLowerCase();
    filtered = filtered.filter(n => n.contentMd.toLowerCase().includes(q));
  }

  // Fuse.js full-text for general query
  if (parsed.general) {
    const fuse = new Fuse(filtered, {
      keys: [
        { name: 'title', weight: 0.5 },
        { name: 'contentMd', weight: 0.4 },
      ],
      threshold: 0.35,
      includeScore: true,
      ignoreLocation: true,
      minMatchCharLength: 1,
    });
    const results = fuse.search(parsed.general);
    filtered = results.map(r => r.item);
  }

  return filtered;
}
