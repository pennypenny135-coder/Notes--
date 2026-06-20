import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Note, Notebook, Tag, Attachment, NoteLink,
  SidebarView, EditorMode, SortOrder, SortDir,
  SearchFilter, AppSettings
} from '../types';
import {
  db, getAllNotes, getAllNotebooks, getAllTags,
  saveNote as dbSaveNote, deleteNotePermanently,
  getBacklinks, getOutlinks, updateNoteLinks,
  getAttachmentsByNote, deleteAttachment as dbDeleteAttachment
} from '../db/database';
import { generateId } from '../utils/id';
import { extractWikiLinks } from '../utils/wikilinks';
import { countWords } from '../utils/text';

// ─── State Interface ─────────────────────────────────────────────────────────

interface AppState {
  // Data
  notes: Note[];
  notebooks: Notebook[];
  tags: Tag[];
  attachments: Attachment[];
  backlinks: NoteLink[];
  outlinks: NoteLink[];

  // UI
  activeNoteId: string | null;
  activeNotebookId: string | null;
  activeTagId: string | null;
  sidebarView: SidebarView;
  editorMode: EditorMode;
  searchFilter: SearchFilter;
  sortOrder: SortOrder;
  sortDir: SortDir;
  showShortcuts: boolean;
  showSettings: boolean;
  showCommandPalette: boolean;
  sidebarCollapsed: boolean;
  listCollapsed: boolean;

  // Settings
  settings: AppSettings;

  // Actions
  loadAll: () => Promise<void>;
  loadAttachments: (noteId: string) => Promise<void>;

  // Note actions
  createNote: (partial?: Partial<Note>) => Promise<Note>;
  updateNote: (id: string, partial: Partial<Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  restoreNote: (id: string) => Promise<void>;
  permanentlyDeleteNote: (id: string) => Promise<void>;
  duplicateNote: (id: string) => Promise<Note | null>;
  pinNote: (id: string, pinned: boolean) => Promise<void>;
  favoriteNote: (id: string, fav: boolean) => Promise<void>;
  setActiveNote: (id: string | null) => Promise<void>;

  // Folder actions
  createNotebook: (name: string, parentId?: string | null) => Promise<Notebook | null>;
  updateNotebook: (id: string, partial: Partial<Notebook>) => Promise<void>;
  deleteNotebook: (id: string) => Promise<void>;

  // Tag actions
  createTag: (name: string, color?: string) => Promise<Tag>;
  updateTag: (id: string, partial: Partial<Tag>) => Promise<void>;
  deleteTag: (id: string) => Promise<void>;
  addTagToNote: (noteId: string, tagId: string) => Promise<void>;
  removeTagFromNote: (noteId: string, tagId: string) => Promise<void>;

  // Attachment actions
  addAttachment: (noteId: string, file: File) => Promise<Attachment>;
  removeAttachment: (attachmentId: string) => Promise<void>;

  // UI actions
  setSidebarView: (view: SidebarView) => void;
  setEditorMode: (mode: EditorMode) => void;
  setSearchFilter: (filter: Partial<SearchFilter>) => void;
  setSortOrder: (order: SortOrder, dir?: SortDir) => void;
  setActiveNotebook: (id: string | null) => void;
  setActiveTag: (id: string | null) => void;
  toggleSidebar: () => void;
  toggleList: () => void;
  setShowShortcuts: (v: boolean) => void;
  setShowSettings: (v: boolean) => void;
  setShowCommandPalette: (v: boolean) => void;
  updateSettings: (partial: Partial<AppSettings>) => void;
}

// ─── Default Settings ────────────────────────────────────────────────────────

const defaultSettings: AppSettings = {
  theme: 'system',
  editorMode: 'split',
  fontSize: 14,
  fontFamily: 'mono',
  lineHeight: 1.7,
  autosaveInterval: 1500,
  showWordCount: true,
  showLineNumbers: false,
  sidebarWidth: 220,
  listWidth: 280,
  defaultNotebookId: null,
  spellcheck: false,
};

// ─── Helper: get folder depth (root = 1) ────────────────────────────────────

function getFolderDepth(notebooks: Notebook[], folderId: string | null): number {
  if (!folderId) return 0;
  let depth = 0;
  let current: string | null = folderId;
  while (current) {
    depth++;
    const parent = notebooks.find(n => n.id === current);
    current = parent?.parentId ?? null;
    if (depth > 10) break;
  }
  return depth;
}

// ─── Helper: collect all descendant folder IDs (including self) ──────────────

function collectFolderIds(notebooks: Notebook[], rootId: string): string[] {
  const ids: string[] = [rootId];
  const queue = [rootId];
  while (queue.length) {
    const current = queue.shift()!;
    const children = notebooks.filter(n => n.parentId === current);
    for (const child of children) {
      ids.push(child.id);
      queue.push(child.id);
    }
  }
  return ids;
}

// ─── Helper: remove orphan tags (tags with no active notes) ──────────────────

async function pruneOrphanTags(
  remainingNotes: Note[],
  currentTags: Tag[],
  activeTagId: string | null
): Promise<{ tags: Tag[]; activeTagId: string | null }> {
  const usedTagIds = new Set(remainingNotes.flatMap(n => n.tags));
  const orphans = currentTags.filter(t => !usedTagIds.has(t.id));
  for (const tag of orphans) {
    await db.tags.delete(tag.id);
  }
  const orphanIds = new Set(orphans.map(t => t.id));
  return {
    tags: currentTags.filter(t => !orphanIds.has(t.id)),
    activeTagId: activeTagId && orphanIds.has(activeTagId) ? null : activeTagId,
  };
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      notes: [],
      notebooks: [],
      tags: [],
      attachments: [],
      backlinks: [],
      outlinks: [],

      activeNoteId: null,
      activeNotebookId: null,
      activeTagId: null,
      sidebarView: 'all',
      editorMode: 'split',
      searchFilter: { query: '' },
      sortOrder: 'updatedAt',
      sortDir: 'desc',
      showShortcuts: false,
      showSettings: false,
      showCommandPalette: false,
      sidebarCollapsed: false,
      listCollapsed: false,

      settings: defaultSettings,

      // ── Load ──────────────────────────────────────────────────────────────

      loadAll: async () => {
        const [notes, notebooks, tags] = await Promise.all([
          getAllNotes(),
          getAllNotebooks(),
          getAllTags(),
        ]);
        set({ notes, notebooks, tags });
      },

      loadAttachments: async (noteId) => {
        const attachments = await getAttachmentsByNote(noteId);
        set({ attachments });
      },

      // ── Notes ─────────────────────────────────────────────────────────────

      createNote: async (partial = {}) => {
        const now = Date.now();
        const { activeNotebookId, settings } = get();
        const note: Note = {
          id: generateId(),
          title: 'Untitled Note',
          contentMd: '',
          notebookId: partial.notebookId ?? activeNotebookId ?? settings.defaultNotebookId,
          status: 'active',
          isPinned: false,
          isFavorite: false,
          tags: [],
          wordCount: 0,
          charCount: 0,
          createdAt: now,
          updatedAt: now,
          openedAt: now,
          sortOrder: now,
          ...partial,
        };
        await dbSaveNote(note);
        set(s => ({ notes: [note, ...s.notes] }));
        return note;
      },

      updateNote: async (id, partial) => {
        const { notes } = get();
        const existing = notes.find(n => n.id === id);
        if (!existing) return;
        const now = Date.now();
        const contentChanged = partial.contentMd !== undefined && partial.contentMd !== existing.contentMd;
        const updated: Note = {
          ...existing,
          ...partial,
          updatedAt: now,
          wordCount: contentChanged
            ? countWords(partial.contentMd ?? existing.contentMd)
            : (partial.wordCount ?? existing.wordCount),
          charCount: contentChanged
            ? (partial.contentMd ?? existing.contentMd).length
            : (partial.charCount ?? existing.charCount),
        };
        await dbSaveNote(updated);
        if (contentChanged) {
          const allNotes = get().notes;
          const rawLinks = extractWikiLinks(updated.contentMd);
          const resolvedLinks = rawLinks
            .map(({ title, context }) => {
              const target = allNotes.find(n => n.title.toLowerCase() === title.toLowerCase() && n.id !== id);
              return target ? { id: target.id, context } : null;
            })
            .filter(Boolean) as { id: string; context: string }[];
          await updateNoteLinks(id, resolvedLinks);
          const outlinks = await getOutlinks(id);
          set(s => ({
            notes: s.notes.map(n => n.id === id ? updated : n),
            outlinks: s.activeNoteId === id ? outlinks : s.outlinks,
          }));
        } else {
          set(s => ({ notes: s.notes.map(n => n.id === id ? updated : n) }));
        }
      },

      deleteNote: async (id) => {
        const { notes, tags, activeTagId } = get();
        const note = notes.find(n => n.id === id);
        if (!note) return;
        const trashed: Note = { ...note, status: 'trash', updatedAt: Date.now() };
        await dbSaveNote(trashed);
        const remaining = notes.filter(n => n.id !== id && n.status === 'active');
        const { tags: prunedTags, activeTagId: prunedActiveTagId } =
          await pruneOrphanTags(remaining, tags, activeTagId);
        set(s => ({
          notes: s.notes.filter(n => n.id !== id),
          activeNoteId: s.activeNoteId === id ? null : s.activeNoteId,
          tags: prunedTags,
          activeTagId: prunedActiveTagId,
        }));
      },

      restoreNote: async (id) => {
        await db.notes.update(id, { status: 'active', updatedAt: Date.now() });
        const note = await db.notes.get(id);
        if (note) {
          set(s => ({ notes: [note, ...s.notes] }));
        }
      },

      permanentlyDeleteNote: async (id) => {
        const { notes, tags, activeTagId } = get();
        await deleteNotePermanently(id);
        const remaining = notes.filter(n => n.id !== id);
        const { tags: prunedTags, activeTagId: prunedActiveTagId } =
          await pruneOrphanTags(remaining, tags, activeTagId);
        set(s => ({
          notes: remaining,
          activeNoteId: s.activeNoteId === id ? null : s.activeNoteId,
          tags: prunedTags,
          activeTagId: prunedActiveTagId,
        }));
      },

      duplicateNote: async (id) => {
        const { notes } = get();
        const note = notes.find(n => n.id === id);
        if (!note) return null;
        const now = Date.now();
        const copy: Note = {
          ...note,
          id: generateId(),
          title: note.title + ' (copy)',
          createdAt: now,
          updatedAt: now,
          openedAt: now,
          sortOrder: now,
          isPinned: false,
        };
        await dbSaveNote(copy);
        set(s => ({ notes: [copy, ...s.notes] }));
        return copy;
      },

      pinNote: async (id, pinned) => {
        await db.notes.update(id, { isPinned: pinned, updatedAt: Date.now() });
        set(s => ({ notes: s.notes.map(n => n.id === id ? { ...n, isPinned: pinned } : n) }));
      },

      favoriteNote: async (id, fav) => {
        await db.notes.update(id, { isFavorite: fav, updatedAt: Date.now() });
        set(s => ({ notes: s.notes.map(n => n.id === id ? { ...n, isFavorite: fav } : n) }));
      },

      setActiveNote: async (id) => {
        if (id) {
          await db.notes.update(id, { openedAt: Date.now() });
          const [backlinks, outlinks, attachments] = await Promise.all([
            getBacklinks(id),
            getOutlinks(id),
            getAttachmentsByNote(id),
          ]);
          set(s => ({
            activeNoteId: id,
            notes: s.notes.map(n => n.id === id ? { ...n, openedAt: Date.now() } : n),
            backlinks,
            outlinks,
            attachments,
          }));
        } else {
          set({ activeNoteId: null, backlinks: [], outlinks: [], attachments: [] });
        }
      },

      // ── Folders ───────────────────────────────────────────────────────────

      createNotebook: async (name, parentId = null) => {
        const { notebooks } = get();
        const parentDepth = getFolderDepth(notebooks, parentId);
        if (parentDepth >= 3) {
          alert('Maximum folder depth is 3 levels.');
          return null;
        }
        const now = Date.now();
        const nb: Notebook = {
          id: generateId(),
          name,
          parentId,
          createdAt: now,
          updatedAt: now,
          sortOrder: now,
        };
        await db.notebooks.add(nb);
        set(s => ({ notebooks: [...s.notebooks, nb] }));
        return nb;
      },

      updateNotebook: async (id, partial) => {
        await db.notebooks.update(id, { ...partial, updatedAt: Date.now() });
        set(s => ({ notebooks: s.notebooks.map(n => n.id === id ? { ...n, ...partial } : n) }));
      },

      deleteNotebook: async (id) => {
        const { notebooks, notes, tags, activeTagId } = get();

        // Collect this folder + all descendant folder IDs
        const folderIds = collectFolderIds(notebooks, id);

        // Permanently delete all notes inside any of those folders
        const affectedNotes = notes.filter(n => n.notebookId && folderIds.includes(n.notebookId));
        for (const note of affectedNotes) {
          await deleteNotePermanently(note.id);
        }

        // Delete all folders (children first via reverse BFS order)
        for (const fid of [...folderIds].reverse()) {
          await db.notebooks.delete(fid);
        }

        // Remaining notes after deletion
        const affectedIds = new Set(affectedNotes.map(n => n.id));
        const remainingNotes = notes.filter(n => !affectedIds.has(n.id));

        // Prune orphan tags
        const { tags: prunedTags, activeTagId: prunedActiveTagId } =
          await pruneOrphanTags(remainingNotes, tags, activeTagId);

        set(s => ({
          notebooks: s.notebooks.filter(n => !folderIds.includes(n.id)),
          notes: remainingNotes,
          tags: prunedTags,
          activeTagId: prunedActiveTagId,
          activeNoteId: s.activeNoteId && affectedIds.has(s.activeNoteId) ? null : s.activeNoteId,
          activeNotebookId: s.activeNotebookId && folderIds.includes(s.activeNotebookId) ? null : s.activeNotebookId,
        }));
      },

      // ── Tags ──────────────────────────────────────────────────────────────

      createTag: async (name, color) => {
        const now = Date.now();
        const existing = get().tags.find(t => t.name.toLowerCase() === name.toLowerCase());
        if (existing) return existing;
        const tag: Tag = {
          id: generateId(),
          name: name.trim(),
          color,
          createdAt: now,
        };
        await db.tags.add(tag);
        set(s => ({ tags: [...s.tags, tag].sort((a, b) => a.name.localeCompare(b.name)) }));
        return tag;
      },

      updateTag: async (id, partial) => {
        await db.tags.update(id, partial);
        set(s => ({ tags: s.tags.map(t => t.id === id ? { ...t, ...partial } : t) }));
      },

      deleteTag: async (id) => {
        await db.tags.delete(id);
        const affected = get().notes.filter(n => n.tags.includes(id));
        for (const note of affected) {
          const updated = { ...note, tags: note.tags.filter(t => t !== id), updatedAt: Date.now() };
          await dbSaveNote(updated);
        }
        set(s => ({
          tags: s.tags.filter(t => t.id !== id),
          notes: s.notes.map(n => n.tags.includes(id)
            ? { ...n, tags: n.tags.filter(t => t !== id) }
            : n),
        }));
      },

      addTagToNote: async (noteId, tagId) => {
        const note = get().notes.find(n => n.id === noteId);
        if (!note || note.tags.includes(tagId)) return;
        const updated = { ...note, tags: [...note.tags, tagId], updatedAt: Date.now() };
        await dbSaveNote(updated);
        set(s => ({ notes: s.notes.map(n => n.id === noteId ? updated : n) }));
      },

      removeTagFromNote: async (noteId, tagId) => {
        const { notes, tags, activeTagId } = get();
        const note = notes.find(n => n.id === noteId);
        if (!note) return;
        const updated = { ...note, tags: note.tags.filter(t => t !== tagId), updatedAt: Date.now() };
        await dbSaveNote(updated);
        const updatedNotes = notes.map(n => n.id === noteId ? updated : n);
        const stillUsed = updatedNotes.some(n => n.status === 'active' && n.tags.includes(tagId));
        if (!stillUsed) {
          await db.tags.delete(tagId);
          set(s => ({
            notes: updatedNotes,
            tags: s.tags.filter(t => t.id !== tagId),
            activeTagId: s.activeTagId === tagId ? null : s.activeTagId,
          }));
        } else {
          set({ notes: updatedNotes });
        }
      },

      // ── Attachments ───────────────────────────────────────────────────────

      addAttachment: async (noteId, file) => {
        const now = Date.now();
        const data = await fileToBase64(file);
        const att: Attachment = {
          id: generateId(),
          noteId,
          filename: file.name,
          mimeType: file.type,
          size: file.size,
          data,
          createdAt: now,
        };
        await db.attachments.add(att);
        set(s => ({ attachments: [...s.attachments, att] }));
        return att;
      },

      removeAttachment: async (attachmentId) => {
        await dbDeleteAttachment(attachmentId);
        set(s => ({ attachments: s.attachments.filter(a => a.id !== attachmentId) }));
      },

      // ── UI ────────────────────────────────────────────────────────────────

      setSidebarView: (view) => set({ sidebarView: view }),
      setEditorMode: (mode) => set({ editorMode: mode }),
      setSearchFilter: (filter) => set(s => ({ searchFilter: { ...s.searchFilter, ...filter } })),
      setSortOrder: (order, dir) => set(s => ({ sortOrder: order, sortDir: dir ?? s.sortDir })),
      setActiveNotebook: (id) => set({ activeNotebookId: id }),
      setActiveTag: (id) => set({ activeTagId: id }),
      toggleSidebar: () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      toggleList: () => set(s => ({ listCollapsed: !s.listCollapsed })),
      setShowShortcuts: (v) => set({ showShortcuts: v }),
      setShowSettings: (v) => set({ showSettings: v }),
      setShowCommandPalette: (v) => set({ showCommandPalette: v }),
      updateSettings: (partial) => set(s => ({ settings: { ...s.settings, ...partial } })),
    }),
    {
      name: 'notevault-ui',
      partialize: (s) => ({
        sidebarView: s.sidebarView,
        editorMode: s.editorMode,
        sortOrder: s.sortOrder,
        sortDir: s.sortDir,
        sidebarCollapsed: s.sidebarCollapsed,
        listCollapsed: s.listCollapsed,
        settings: s.settings,
      }),
    }
  )
);

// ─── Util ─────────────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
