import Dexie, { type Table } from 'dexie';
import type { Note, Notebook, Tag, Attachment, NoteLink } from '../types';

export class NoteVaultDB extends Dexie {
  notes!: Table<Note, string>;
  notebooks!: Table<Notebook, string>;
  tags!: Table<Tag, string>;
  attachments!: Table<Attachment, string>;
  noteLinks!: Table<NoteLink, string>;

  constructor() {
    super('NoteVaultDB');

    this.version(1).stores({
      notes: 'id, title, notebookId, status, isPinned, isFavorite, createdAt, updatedAt, openedAt, sortOrder, *tags',
      notebooks: 'id, name, parentId, createdAt, updatedAt, sortOrder',
      tags: 'id, name, createdAt',
      attachments: 'id, noteId, filename, mimeType, createdAt',
      noteLinks: 'id, fromNoteId, toNoteId, createdAt',
    });
  }
}

export const db = new NoteVaultDB();

// ─── Helpers ────────────────────────────────────────────────────────────────

export async function getAllNotes(): Promise<Note[]> {
  return db.notes.where('status').anyOf(['active', 'draft']).sortBy('updatedAt');
}

export async function getNoteById(id: string): Promise<Note | undefined> {
  return db.notes.get(id);
}

export async function saveNote(note: Note): Promise<void> {
  await db.notes.put(note);
}

export async function deleteNotePermanently(id: string): Promise<void> {
  await db.notes.delete(id);
  await db.noteLinks.where('fromNoteId').equals(id).delete();
  await db.noteLinks.where('toNoteId').equals(id).delete();
  await db.attachments.where('noteId').equals(id).delete();
}

export async function getBacklinks(noteId: string): Promise<NoteLink[]> {
  return db.noteLinks.where('toNoteId').equals(noteId).toArray();
}

export async function getOutlinks(noteId: string): Promise<NoteLink[]> {
  return db.noteLinks.where('fromNoteId').equals(noteId).toArray();
}

export async function updateNoteLinks(fromNoteId: string, toNoteIds: { id: string; context: string }[]): Promise<void> {
  await db.noteLinks.where('fromNoteId').equals(fromNoteId).delete();
  const now = Date.now();
  const links: NoteLink[] = toNoteIds.map(({ id, context }) => ({
    id: `${fromNoteId}->${id}-${now}`,
    fromNoteId,
    toNoteId: id,
    context,
    createdAt: now,
  }));
  if (links.length > 0) {
    await db.noteLinks.bulkAdd(links);
  }
}

export async function getAllTags(): Promise<Tag[]> {
  return db.tags.orderBy('name').toArray();
}

export async function getAllNotebooks(): Promise<Notebook[]> {
  return db.notebooks.orderBy('sortOrder').toArray();
}

export async function getAttachmentsByNote(noteId: string): Promise<Attachment[]> {
  return db.attachments.where('noteId').equals(noteId).toArray();
}

export async function deleteAttachment(id: string): Promise<void> {
  await db.attachments.delete(id);
}
