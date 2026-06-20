// ─── Core Data Types ───────────────────────────────────────────────────────

export interface Notebook {
  id: string;
  name: string;
  parentId: string | null;
  color?: string;
  icon?: string;
  createdAt: number;
  updatedAt: number;
  sortOrder: number;
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
  createdAt: number;
}

export interface Attachment {
  id: string;
  noteId: string;
  filename: string;
  mimeType: string;
  size: number;
  data: string; // base64
  createdAt: number;
}

export interface NoteLink {
  id: string;
  fromNoteId: string;
  toNoteId: string;
  context?: string; // surrounding text snippet
  createdAt: number;
}

export type NoteStatus = 'active' | 'draft' | 'archived' | 'trash';

export interface Note {
  id: string;
  title: string;
  contentMd: string;
  notebookId: string | null;
  status: NoteStatus;
  isPinned: boolean;
  isFavorite: boolean;
  tags: string[]; // tag ids
  source?: string;
  wordCount: number;
  charCount: number;
  createdAt: number;
  updatedAt: number;
  openedAt: number;
  sortOrder: number;
}

// ─── UI State Types ─────────────────────────────────────────────────────────

export type SidebarView = 'notebooks' | 'tags' | 'all' | 'favorites' | 'recent' | 'trash';

export type EditorMode = 'split' | 'edit' | 'preview';

export type SortOrder = 'updatedAt' | 'createdAt' | 'title' | 'wordCount';
export type SortDir = 'asc' | 'desc';

export interface SearchFilter {
  query: string;
  tag?: string;
  notebook?: string;
  titleOnly?: boolean;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  editorMode: EditorMode;
  fontSize: number;
  fontFamily: 'mono' | 'sans' | 'serif';
  lineHeight: number;
  autosaveInterval: number; // ms
  showWordCount: boolean;
  showLineNumbers: boolean;
  sidebarWidth: number;
  listWidth: number;
  defaultNotebookId: string | null;
  spellcheck: boolean;
}

// ─── Import / Export ────────────────────────────────────────────────────────

export interface ExportOptions {
  format: 'markdown' | 'json' | 'zip';
  includeAttachments: boolean;
  includeMetadata: boolean;
  noteIds?: string[]; // if undefined, export all
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}
