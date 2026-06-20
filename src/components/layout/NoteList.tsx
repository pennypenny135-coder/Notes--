import React, { useMemo, useState, useCallback } from 'react';
import { Pin, Star, FileText, Copy, Trash2, StarOff, CheckSquare, Square, X, FolderInput } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { cn } from '../../utils/cn';
import { searchNotes } from '../../utils/search';
import { formatDate, extractPreview } from '../../utils/text';
import { MoveNoteModal } from '../modals/MoveNoteModal';
import type { Note } from '../../types';

export function NoteList() {
  const {
    notes, tags, notebooks, activeNoteId, activeNotebookId, activeTagId,
    sidebarView, searchFilter, sortOrder, sortDir, settings,
    setActiveNote, deleteNote, duplicateNote, pinNote, favoriteNote,
    listCollapsed,
  } = useAppStore();

  const [contextMenu, setContextMenu] = useState<{ noteId: string; x: number; y: number } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [moveNoteId, setMoveNoteId] = useState<string | null>(null);

  const tagMap = useMemo(() => new Map(tags.map(t => [t.id, t])), [tags]);

  const filtered = useMemo(() => {
    let pool = notes.filter(n => {
      if (sidebarView === 'trash') return n.status === 'trash';
      if (n.status === 'trash') return false;
      if (sidebarView === 'favorites') return n.isFavorite;
      if (sidebarView === 'recent') return true;
      if (sidebarView === 'notebooks' && activeNotebookId) return n.notebookId === activeNotebookId;
      if (sidebarView === 'tags' && activeTagId) return n.tags.includes(activeTagId);
      return true;
    });

    if (searchFilter.query.trim()) {
      pool = searchNotes(pool, tags, searchFilter.query);
    }

    pool = [...pool].sort((a, b) => {
      let va: string | number = 0, vb: string | number = 0;
      if (sortOrder === 'title') { va = a.title.toLowerCase(); vb = b.title.toLowerCase(); }
      else if (sortOrder === 'createdAt') { va = a.createdAt; vb = b.createdAt; }
      else if (sortOrder === 'wordCount') { va = a.wordCount; vb = b.wordCount; }
      else { va = a.updatedAt; vb = b.updatedAt; }
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });

    if (sidebarView !== 'trash') {
      const pinned = pool.filter(n => n.isPinned);
      const rest = pool.filter(n => !n.isPinned);
      return [...pinned, ...rest];
    }
    return pool;
  }, [notes, tags, sidebarView, activeNotebookId, activeTagId, searchFilter, sortOrder, sortDir]);

  const handleContextMenu = (e: React.MouseEvent, noteId: string) => {
    if (selectMode) return;
    e.preventDefault();
    setContextMenu({ noteId, x: e.clientX, y: e.clientY });
  };

  const closeContextMenu = () => setContextMenu(null);

  const getNotebookName = (id: string | null) =>
    id ? notebooks.find(n => n.id === id)?.name : null;

  const toggleSelectMode = useCallback(() => {
    setSelectMode(v => !v);
    setSelectedIds(new Set());
    setContextMenu(null);
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(filtered.map(n => n.id)));
  }, [filtered]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleBulkDelete = useCallback(async () => {
    setShowConfirm(false);
    for (const id of selectedIds) {
      await deleteNote(id);
    }
    setSelectedIds(new Set());
    setSelectMode(false);
  }, [selectedIds, deleteNote]);

  if (listCollapsed) return null;

  return (
    <div
      className="flex flex-col h-full bg-surface-alt border-r border-border relative"
      style={{ width: `${settings.listWidth}px`, minWidth: `${settings.listWidth}px` }}
      onClick={closeContextMenu}
    >
      {/* List header */}
      <div className="px-3 py-2 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-muted uppercase tracking-wider">
            {selectMode
              ? `${selectedIds.size} selected`
              : `${filtered.length} note${filtered.length !== 1 ? 's' : ''}`}
          </span>
          <div className="flex items-center gap-1">
            {selectMode ? (
              <>
                <button
                  onClick={e => { e.stopPropagation(); selectAll(); }}
                  className="text-[10px] px-2 py-0.5 rounded bg-surface-hover text-muted hover:text-fg transition-colors"
                >All</button>
                <button
                  onClick={e => { e.stopPropagation(); clearSelection(); }}
                  className="text-[10px] px-2 py-0.5 rounded bg-surface-hover text-muted hover:text-fg transition-colors"
                >None</button>
                {selectedIds.size > 0 && (
                  <button
                    onClick={e => { e.stopPropagation(); setShowConfirm(true); }}
                    className="text-[10px] px-2 py-0.5 rounded bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors flex items-center gap-1"
                  >
                    <Trash2 size={10} /> Delete {selectedIds.size}
                  </button>
                )}
                <button
                  onClick={e => { e.stopPropagation(); toggleSelectMode(); }}
                  className="p-0.5 rounded hover:bg-surface-hover text-muted hover:text-fg transition-colors"
                  title="Exit select mode"
                >
                  <X size={13} />
                </button>
              </>
            ) : (
              <button
                onClick={e => { e.stopPropagation(); toggleSelectMode(); }}
                className="p-0.5 rounded hover:bg-surface-hover text-muted hover:text-fg transition-colors"
                title="Select notes"
              >
                <CheckSquare size={13} />
              </button>
            )}
          </div>
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
                selectMode={selectMode}
                isSelected={selectedIds.has(note.id)}
                onClick={() => {
                  if (selectMode) {
                    toggleSelect(note.id);
                  } else {
                    setActiveNote(note.id);
                  }
                }}
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
          onMoveToFolder={() => {
            setMoveNoteId(contextMenu.noteId);
            closeContextMenu();
          }}
          note={notes.find(n => n.id === contextMenu.noteId)!}
        />
      )}

      {/* Move to Folder modal */}
      {moveNoteId && (
        <MoveNoteModal
          noteId={moveNoteId}
          onClose={() => setMoveNoteId(null)}
        />
      )}

      {/* Bulk delete confirm dialog */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="bg-surface border border-border rounded-xl shadow-xl p-5 w-72 text-center"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-500/10 mx-auto mb-3">
              <Trash2 size={18} className="text-red-500" />
            </div>
            <h3 className="font-semibold text-fg mb-1">Delete {selectedIds.size} note{selectedIds.size !== 1 ? 's' : ''}?</h3>
            <p className="text-xs text-muted mb-4">These notes will be moved to Trash. This cannot be undone easily.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-1.5 rounded-lg border border-border text-sm text-fg hover:bg-surface-hover transition-colors"
              >Cancel</button>
              <button
                onClick={handleBulkDelete}
                className="flex-1 py-1.5 rounded-lg bg-red-500 text-white text-sm hover:bg-red-600 transition-colors"
              >Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Note List Item ────────────────────────────────────────────────────────────

interface NoteListItemProps {
  note: Note;
  isActive: boolean;
  tagMap: Map<string, { name: string; color?: string }>;
  notebookName: string | null | undefined;
  selectMode: boolean;
  isSelected: boolean;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

function NoteListItem({ note, isActive, tagMap, notebookName, selectMode, isSelected, onClick, onContextMenu }: NoteListItemProps) {
  const preview = extractPreview(note.contentMd, 120);

  return (
    <div
      className={cn(
        'px-3 py-2.5 cursor-pointer border-b border-border/50 transition-colors group',
        isSelected
          ? 'bg-accent/20 border-l-2 border-l-accent'
          : isActive && !selectMode
            ? 'bg-accent/15 border-l-2 border-l-accent'
            : 'hover:bg-surface-hover border-l-2 border-l-transparent'
      )}
      onClick={onClick}
      onContextMenu={onContextMenu}
    >
      <div className="flex items-start gap-1.5 mb-0.5">
        {selectMode ? (
          <span className="flex-shrink-0 mt-0.5 text-accent">
            {isSelected ? <CheckSquare size={13} /> : <Square size={13} className="text-muted" />}
          </span>
        ) : (
          <>
            {note.isPinned && <Pin size={10} className="text-amber-500 flex-shrink-0 mt-1" />}
            {note.isFavorite && <Star size={10} className="text-amber-400 fill-amber-400 flex-shrink-0 mt-1" />}
          </>
        )}
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

// ─── Context Menu ───────────────────────────────────────────────────────────────

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
  onMoveToFolder: () => void;
}

function ContextMenu({ x, y, note, onClose, onDelete, onDuplicate, onPin, onFavorite, onMoveToFolder }: ContextMenuProps) {
  if (!note) return null;
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 bg-surface border border-border rounded-lg shadow-lg py-1 min-w-[170px] text-sm"
        style={{ left: Math.min(x, window.innerWidth - 180), top: Math.min(y, window.innerHeight - 200) }}
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
        <button
          onClick={onMoveToFolder}
          className="w-full px-3 py-1.5 text-left hover:bg-surface-hover flex items-center gap-2 text-fg"
        >
          <FolderInput size={13} /> Move to Folder
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
