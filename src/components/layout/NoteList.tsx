import React, { useMemo, useState } from 'react';
import { Pin, Star, FileText, Copy, Trash2, StarOff } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { cn } from '../../utils/cn';
import { searchNotes } from '../../utils/search';
import { formatDate, extractPreview } from '../../utils/text';
import React from 'react';
import type { Note } from '../../types';

export function NoteList() {
  const {
    notes, tags, notebooks, activeNoteId, activeNotebookId, activeTagId,
    sidebarView, searchFilter, sortOrder, sortDir, settings,
    setActiveNote, deleteNote, duplicateNote, pinNote, favoriteNote,
    listCollapsed,
  } = useAppStore();

  const [contextMenu, setContextMenu] = useState<{ noteId: string; x: number; y: number } | null>(null);

  const tagMap = useMemo(() => new Map(tags.map(t => [t.id, t])), [tags]);

  const filtered = useMemo(() => {
    let pool = notes.filter(n => {
      // trash view
      if (sidebarView === 'trash') return n.status === 'trash';
      if (n.status === 'trash') return false;

      // view filter
      if (sidebarView === 'favorites') return n.isFavorite;
      if (sidebarView === 'recent') return true;
      if (sidebarView === 'daily') return /^\d{4}-\d{2}-\d{2}$/.test(n.title);
      if (sidebarView === 'notebooks' && activeNotebookId) return n.notebookId === activeNotebookId;
      if (sidebarView === 'tags' && activeTagId) return n.tags.includes(activeTagId);
      return true;
    });

    // Search
    if (searchFilter.query.trim()) {
      pool = searchNotes(pool, tags, searchFilter.query);
    }

    // Sort
    pool = [...pool].sort((a, b) => {
      let va: string | number = 0, vb: string | number = 0;
      if (sortOrder === 'title') { va = a.title.toLowerCase(); vb = b.title.toLowerCase(); }
      else if (sortOrder === 'createdAt') { va = a.createdAt; vb = b.createdAt; }
      else if (sortOrder === 'wordCount') { va = a.wordCount; vb = b.wordCount; }
      else { va = a.updatedAt; vb = b.updatedAt; }

      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });

    // Pinned first (only for non-trash)
    if (sidebarView !== 'trash') {
      const pinned = pool.filter(n => n.isPinned);
      const rest = pool.filter(n => !n.isPinned);
      return [...pinned, ...rest];
    }
    return pool;
  }, [notes, tags, sidebarView, activeNotebookId, activeTagId, searchFilter, sortOrder, sortDir]);

  const handleContextMenu = (e: React.MouseEvent, noteId: string) => {
    e.preventDefault();
    setContextMenu({ noteId, x: e.clientX, y: e.clientY });
  };

  const closeContextMenu = () => setContextMenu(null);

  const getNotebookName = (id: string | null) =>
    id ? notebooks.find(n => n.id === id)?.name : null;

  if (listCollapsed) return null;

  return (
    <div
      className="flex flex-col h-full bg-surface-alt border-r border-border relative"
      style={{ width: `${settings.listWidth}px`, minWidth: `${settings.listWidth}px` }}
      onClick={closeContextMenu}
    >
      {/* List header */}
      <div className="px-3 py-2 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted uppercase tracking-wider">
            {filtered.length} note{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted text-sm p-6 text-center">
            <FileText size={32} className="mb-3 opacity-30" />
            <p className="font-medium text-fg opacity-50">No notes</p>
            <p className="text-xs mt-1 opacity-40">
              {searchFilter.query ? 'No results for your search' : 'Create your first note'}
            </p>
          </div>
        ) : (
          <div className="py-1">
            {filtered.map(note => (
              <NoteListItem
                key={note.id}
                note={note}
                isActive={activeNoteId === note.id}
                tagMap={tagMap}
                notebookName={getNotebookName(note.notebookId)}
                onClick={() => setActiveNote(note.id)}
                onContextMenu={(e) => handleContextMenu(e, note.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          noteId={contextMenu.noteId}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={closeContextMenu}
          onDelete={async () => { await deleteNote(contextMenu.noteId); closeContextMenu(); }}
          onDuplicate={async () => {
            const copy = await duplicateNote(contextMenu.noteId);
            if (copy) setActiveNote(copy.id);
            closeContextMenu();
          }}
          onPin={async (pinned) => { await pinNote(contextMenu.noteId, pinned); closeContextMenu(); }}
          onFavorite={async (fav) => { await favoriteNote(contextMenu.noteId, fav); closeContextMenu(); }}
          note={notes.find(n => n.id === contextMenu.noteId)!}
        />
      )}
    </div>
  );
}

// ─── Note List Item ───────────────────────────────────────────────────────────

interface NoteListItemProps {
  note: Note;
  isActive: boolean;
  tagMap: Map<string, { name: string; color?: string }>;
  notebookName: string | null | undefined;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

function NoteListItem({ note, isActive, tagMap, notebookName, onClick, onContextMenu }: NoteListItemProps) {
  const preview = extractPreview(note.contentMd, 120);

  return (
    <div
      className={cn(
        'px-3 py-2.5 cursor-pointer border-b border-border/50 transition-colors group',
        isActive
          ? 'bg-accent/15 border-l-2 border-l-accent'
          : 'hover:bg-surface-hover border-l-2 border-l-transparent'
      )}
      onClick={onClick}
      onContextMenu={onContextMenu}
    >
      <div className="flex items-start gap-1.5 mb-0.5">
        {note.isPinned && <Pin size={10} className="text-amber-500 flex-shrink-0 mt-1" />}
        {note.isFavorite && <Star size={10} className="text-amber-400 fill-amber-400 flex-shrink-0 mt-1" />}
        <span className={cn(
          'text-sm font-medium leading-tight flex-1 min-w-0 truncate',
          isActive ? 'text-fg' : 'text-fg/90'
        )}>
          {note.title || 'Untitled Note'}
        </span>
        {note.status === 'draft' && (
          <span className="text-[10px] bg-amber-400/20 text-amber-600 dark:text-amber-400 px-1 rounded flex-shrink-0">DRAFT</span>
        )}
      </div>

      {preview && (
        <p className="text-xs text-muted leading-relaxed line-clamp-2 mb-1.5">
          {preview}
        </p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] text-muted/60">{formatDate(note.updatedAt)}</span>
        {notebookName && (
          <span className="text-[10px] text-muted/50 truncate max-w-[80px]">{notebookName}</span>
        )}
        {note.tags.slice(0, 3).map(tid => {
          const tag = tagMap.get(tid);
          return tag ? (
            <span key={tid} className="text-[10px] bg-surface-hover text-muted px-1.5 py-0.5 rounded-full">
              #{tag.name}
            </span>
          ) : null;
        })}
        {note.tags.length > 3 && (
          <span className="text-[10px] text-muted/50">+{note.tags.length - 3}</span>
        )}
      </div>
    </div>
  );
}

// ─── Context Menu ─────────────────────────────────────────────────────────────

interface ContextMenuProps {
  noteId: string;
  x: number;
  y: number;
  note: Note;
  onClose: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onPin: (pinned: boolean) => void;
  onFavorite: (fav: boolean) => void;
}

function ContextMenu({ x, y, note, onClose, onDelete, onDuplicate, onPin, onFavorite }: ContextMenuProps) {
  if (!note) return null;
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 bg-surface border border-border rounded-lg shadow-lg py-1 min-w-[160px] text-sm"
        style={{ left: Math.min(x, window.innerWidth - 170), top: Math.min(y, window.innerHeight - 160) }}
      >
        <button
          onClick={() => onPin(!note.isPinned)}
          className="w-full px-3 py-1.5 text-left hover:bg-surface-hover flex items-center gap-2 text-fg"
        >
          <Pin size={13} /> {note.isPinned ? 'Unpin' : 'Pin'}
        </button>
        <button
          onClick={() => onFavorite(!note.isFavorite)}
          className="w-full px-3 py-1.5 text-left hover:bg-surface-hover flex items-center gap-2 text-fg"
        >
          {note.isFavorite ? <StarOff size={13} /> : <Star size={13} />}
          {note.isFavorite ? 'Unfavorite' : 'Favorite'}
        </button>
        <button
          onClick={onDuplicate}
          className="w-full px-3 py-1.5 text-left hover:bg-surface-hover flex items-center gap-2 text-fg"
        >
          <Copy size={13} /> Duplicate
        </button>
        <div className="border-t border-border my-1" />
        <button
          onClick={() => { if (confirm('Delete this note?')) onDelete(); }}
          className="w-full px-3 py-1.5 text-left hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 text-red-500"
        >
          <Trash2 size={13} /> Delete
        </button>
      </div>
    </>
  );
}
