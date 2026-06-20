import JSZip from 'jszip';
import type { Note, Notebook, Tag, Attachment } from '../types';
import { countWords } from './text';

// ─── Frontmatter ──────────────────────────────────────────────────────────────

export function parseFrontmatter(content: string): { meta: Record<string, unknown>; body: string } {
  const fm = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!fm) return { meta: {}, body: content };
  const meta: Record<string, unknown> = {};
  fm[1].split('\n').forEach(line => {
    const [k, ...v] = line.split(':');
    if (k && v.length) meta[k.trim()] = v.join(':').trim();
  });
  return { meta, body: fm[2].trim() };
}

export function generateFrontmatter(note: Note, tagNames: string[]): string {
  const lines = [
    '---',
    `title: ${note.title}`,
    `created: ${new Date(note.createdAt).toISOString()}`,
    `updated: ${new Date(note.updatedAt).toISOString()}`,
  ];
  if (tagNames.length) lines.push(`tags: [${tagNames.join(', ')}]`);
  if (note.source) lines.push(`source: ${note.source}`);
  if (note.isPinned) lines.push('pinned: true');
  if (note.isFavorite) lines.push('favorite: true');
  lines.push('---\n');
  return lines.join('\n');
}

// ─── Single Note Export ───────────────────────────────────────────────────────

export function exportNoteAsMarkdown(note: Note, tagNames: string[]): string {
  const fm = generateFrontmatter(note, tagNames);
  return fm + note.contentMd;
}

export function downloadText(content: string, filename: string, mime = 'text/markdown') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── JSON Backup ──────────────────────────────────────────────────────────────

export interface JsonBackup {
  version: 1;
  exportedAt: string;
  notes: Note[];
  notebooks: Notebook[];
  tags: Tag[];
  attachments: Attachment[];
}

export function exportAsJson(
  notes: Note[],
  notebooks: Notebook[],
  tags: Tag[],
  attachments: Attachment[]
): string {
  const backup: JsonBackup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    notes,
    notebooks,
    tags,
    attachments,
  };
  return JSON.stringify(backup, null, 2);
}

// ─── ZIP Export ───────────────────────────────────────────────────────────────

export async function exportAsZip(
  notes: Note[],
  notebooks: Notebook[],
  tags: Tag[],
  attachments: Attachment[],
  includeAttachments = true
): Promise<Blob> {
  const zip = new JSZip();

  // metadata.json
  const backup = { version: 1, exportedAt: new Date().toISOString(), notebooks, tags };
  zip.file('metadata.json', JSON.stringify(backup, null, 2));

  // notes/
  const notesFolder = zip.folder('notes')!;
  const tagMap = new Map(tags.map(t => [t.id, t.name]));

  for (const note of notes) {
    const tagNames = note.tags.map(id => tagMap.get(id) ?? id);
    const content = exportNoteAsMarkdown(note, tagNames);
    const safeName = note.title.replace(/[<>:"/\\|?*]/g, '_').slice(0, 100);
    notesFolder.file(`${safeName}.md`, content);
  }

  // attachments/
  if (includeAttachments && attachments.length > 0) {
    const attFolder = zip.folder('attachments')!;
    for (const att of attachments) {
      try {
        const base64 = att.data.split(',')[1];
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        attFolder.file(att.filename, bytes);
      } catch {
        // skip
      }
    }
  }

  return zip.generateAsync({ type: 'blob' });
}

// ─── Markdown Import ──────────────────────────────────────────────────────────

export interface ImportedNote {
  note: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'openedAt' | 'sortOrder' | 'tags'>;
  tagNames: string[];
  notebookPath?: string;
}

export function parseMarkdownFile(
  content: string,
  filename: string,
  notebookPath?: string
): ImportedNote {
  const { meta, body } = parseFrontmatter(content);
  const title = (meta.title as string) || filename.replace(/\.md$/i, '');

  let tagNames: string[] = [];
  if (meta.tags) {
    const rawTags = meta.tags as string;
    tagNames = rawTags
      .replace(/[\[\]]/g, '')
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);
  }

  return {
    note: {
      title,
      contentMd: body,
      notebookId: null,
      status: 'active',
      isPinned: meta.pinned === 'true',
      isFavorite: meta.favorite === 'true',
      source: meta.source as string | undefined,
      wordCount: countWords(body),
      charCount: body.length,
    },
    tagNames,
    notebookPath,
  };
}

// ─── JSON Import ──────────────────────────────────────────────────────────────

export function parseJsonBackup(content: string): JsonBackup | null {
  try {
    const data = JSON.parse(content);
    if (data.version === 1 && Array.isArray(data.notes)) return data as JsonBackup;
    return null;
  } catch {
    return null;
  }
}

// ─── File helpers ─────────────────────────────────────────────────────────────

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*\0]/g, '_').slice(0, 100) || 'untitled';
}
