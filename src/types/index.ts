// ─── Note ─────────────────────────────────────────────────────────────────────

export interface Note {
  id: string;
  title: string;
  contentMd: string;
  notebookId: string | null;
  tags: string[];
  status: 'active' | 'archived' | 'trash';
  isPinned: boolean;
  isFavorite: boolean;
  source?: string;
  wordCount: number;
  charCount: number;
  createdAt: number;
  updatedAt: number;
  openedAt: number;
  sortOrder: number;
}

// ─── Notebook / Folder ────────────────────────────────────────────────────────

export interface Notebook {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  createdAt: number;
}

// ─── Tag ──────────────────────────────────────────────────────────────────────

export interface Tag {
  id: string;
  name: string;
  color?: string;
  createdAt: number;
}

// ─── Attachment ───────────────────────────────────────────────────────────────

export interface Attachment {
  id: string;
  noteId: string;
  filename: string;
  mimeType: string;
  size: number;
  data: string; // base64
  createdAt: number;
}

// ─── UI / Store ───────────────────────────────────────────────────────────────

export type SidebarView = 'all' | 'recent' | 'favorites' | 'notebooks' | 'tags' | 'trash';

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  sidebarWidth: number;
  editorWidth: number;
  spellCheck: boolean;
  autoSave: boolean;
  autoSaveInterval: number;
  showWordCount: boolean;
  defaultView: SidebarView;
}

export interface ImportResult {
  imported: number;
  updated?: number;
  skipped: number;
  errors: string[];
}
