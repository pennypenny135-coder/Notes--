import React, { useState, useRef } from 'react';
import {
  Star, Clock, Trash2, FileText,
  ChevronRight, ChevronDown, Plus,
  Folder, FolderOpen, Settings, Keyboard, Hash, RotateCcw, GripVertical
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { cn } from '../../utils/cn';
import { db } from '../../db/database';
import type { SidebarView } from '../../types';

export function Sidebar() {
  const {
    notes, notebooks, tags, sidebarView, activeNotebookId, activeTagId,
    sidebarCollapsed, setSidebarView, setActiveNotebook, setActiveTag,
    createNotebook, deleteNotebook, updateNotebook,
    setShowSettings, setShowShortcuts,
    settings, loadAll,
  } = useAppStore();

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [newFolderName, setNewFolderName] = useState('');
  const [addingFolder, setAddingFolder] = useState(false);
  const [addingSubFolderParentId, setAddingSubFolderParentId] = useState<string | null>(null);
  const [newSubFolderName, setNewSubFolderName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetStep, setResetStep] = useState<1 | 2>(1);
  const [resetting, setResetting] = useState(false);

  // Drag-to-reorder/reparent state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null); // null = root
  const [dragOverRoot, setDragOverRoot] = useState(false);

  const trashCount = notes.filter(n => n.status === 'trash').length;
  const activeNotes = notes.filter(n => n.status !== 'trash');

  const tagCounts = new Map<string, number>();
  activeNotes.forEach(n => n.tags.forEach(tid => tagCounts.set(tid, (tagCounts.get(tid) ?? 0) + 1)));

  const navItem = (
    view: SidebarView,
    label: string,
    icon: React.ReactNode,
    count?: number,
  ) => (
    <button
      key={view}
      onClick={() => { setSidebarView(view); setActiveNotebook(null); setActiveTag(null); }}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors group',
        sidebarView === view && !activeNotebookId && !activeTagId
          ? 'bg-accent text-accent-fg font-medium'
          : 'text-muted hover:text-fg hover:bg-surface-hover'
      )}
    >
      <span className="w-4 h-4 flex-shrink-0">{icon}</span>
      <span className="flex-1 text-left truncate">{label}</span>
      {count !== undefined && count > 0 && (
        <span className="text-xs text-muted opacity-60">{count}</span>
      )}
    </button>
  );

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    await createNotebook(newFolderName.trim(), null);
    setNewFolderName('');
    setAddingFolder(false);
  };

  const handleCreateSubFolder = async (parentId: string) => {
    if (!newSubFolderName.trim()) return;
    await createNotebook(newSubFolderName.trim(), parentId);
    setNewSubFolderName('');
    setAddingSubFolderParentId(null);
    setExpandedFolders(s => { const n = new Set(s); n.add(parentId); return n; });
  };

  const handleRenameFolder = async (id: string) => {
    if (!renameValue.trim()) return;
    await updateNotebook(id, { name: renameValue.trim() });
    setRenamingId(null);
  };

  // Reset All
  const handleResetAll = async () => {
    setResetting(true);
    try {
      await db.notes.clear();
      await db.notebooks.clear();
      await db.tags.clear();
      await db.attachments.clear();
      await loadAll();
    } finally {
      setResetting(false);
      setShowResetConfirm(false);
      setResetStep(1);
    }
  };

  // Depth helper
  const getFolderDepth = (folderId: string): number => {
    let depth = 0;
    let current: string | null = folderId;
    while (current) {
      depth++;
      const parent = notebooks.find(n => n.id === current);
      current = parent?.parentId ?? null;
      if (depth > 10) break;
    }
    return depth;
  };

  // Would moving `sourceId` under `targetParentId` create a cycle or exceed depth?
  const isValidMove = (sourceId: string, targetParentId: string | null): boolean => {
    if (targetParentId === null) return true;
    if (targetParentId === sourceId) return false;
    // check targetParentId is not a descendant of sourceId
    let cur: string | null = targetParentId;
    while (cur) {
      if (cur === sourceId) return false;
      cur = notebooks.find(n => n.id === cur)?.parentId ?? null;
    }
    // depth check: target depth + 1 (source becomes child) must be <= 3
    const targetDepth = getFolderDepth(targetParentId);
    return targetDepth < 3;
  };

  const handleFolderDrop = async (targetParentId: string | null) => {
    if (!draggingId) return;
    if (targetParentId === draggingId) return;
    if (!isValidMove(draggingId, targetParentId)) return;
    await updateNotebook(draggingId, { parentId: targetParentId });
    if (targetParentId) {
      setExpandedFolders(s => { const n = new Set(s); n.add(targetParentId); return n; });
    }
    setDraggingId(null);
    setDragOverId(null);
    setDragOverRoot(false);
  };

  const rootFolders = notebooks.filter(n => !n.parentId);
  const childFolders = (parentId: string) => notebooks.filter(n => n.parentId === parentId);

  const renderFolder = (nb: typeof notebooks[0], depth = 0) => {
    const children = childFolders(nb.id);
    const hasChildren = children.length > 0 || addingSubFolderParentId === nb.id;
    const isExpanded = expandedFolders.has(nb.id);
    const isActive = activeNotebookId === nb.id;
    const noteCount = activeNotes.filter(n => n.notebookId === nb.id).length;
    const currentDepth = getFolderDepth(nb.id);
    const canAddSubFolder = currentDepth < 3;
    const isDragOver = dragOverId === nb.id;
    const isDragging = draggingId === nb.id;

    return (
      <div key={nb.id}>
        <div
          draggable
          onDragStart={e => { e.stopPropagation(); setDraggingId(nb.id); }}
          onDragEnd={() => { setDraggingId(null); setDragOverId(null); setDragOverRoot(false); }}
          onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDragOverId(nb.id); setDragOverRoot(false); }}
          onDragLeave={e => { e.stopPropagation(); setDragOverId(null); }}
          onDrop={e => { e.preventDefault(); e.stopPropagation(); handleFolderDrop(nb.id); }}
          className={cn(
            'group flex items-center gap-1 px-2 py-1 rounded-md cursor-pointer text-sm transition-colors',
            isDragging && 'opacity-40',
            isDragOver && draggingId !== nb.id
              ? 'bg-accent/20 ring-1 ring-accent'
              : isActive
                ? 'bg-accent text-accent-fg font-medium'
                : 'text-muted hover:text-fg hover:bg-surface-hover'
          )}
          style={{ paddingLeft: `${8 + depth * 14}px` }}
          onClick={() => {
            setSidebarView('notebooks');
            setActiveNotebook(nb.id);
            setActiveTag(null);
          }}
        >
          {/* Drag handle */}
          <GripVertical size={11} className="flex-shrink-0 opacity-0 group-hover:opacity-30 cursor-grab mr-0.5" />
          {hasChildren ? (
            <button
              onClick={e => { e.stopPropagation(); setExpandedFolders(s => { const n = new Set(s); n.has(nb.id) ? n.delete(nb.id) : n.add(nb.id); return n; }); }}
              className="flex-shrink-0 w-3 h-3"
            >
              {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
          ) : (
            <span className="w-3" />
          )}
          {isActive || isDragOver
            ? <FolderOpen size={13} className="flex-shrink-0" />
            : <Folder size={13} className="flex-shrink-0" />}
          {renamingId === nb.id ? (
            <input
              autoFocus
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onBlur={() => handleRenameFolder(nb.id)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleRenameFolder(nb.id);
                if (e.key === 'Escape') setRenamingId(null);
              }}
              onClick={e => e.stopPropagation()}
              className="flex-1 bg-transparent outline-none text-fg min-w-0"
            />
          ) : (
            <span className="flex-1 truncate">{nb.name}</span>
          )}
          <span className="text-xs opacity-50 group-hover:opacity-70">{noteCount || ''}</span>
          <div className="hidden group-hover:flex gap-0.5 ml-1">
            {canAddSubFolder && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  setAddingSubFolderParentId(nb.id);
                  setExpandedFolders(s => { const n = new Set(s); n.add(nb.id); return n; });
                }}
                className="p-0.5 rounded hover:bg-surface-hover text-muted"
                title="New subfolder"
              >＋</button>
            )}
            <button
              onClick={e => { e.stopPropagation(); setRenamingId(nb.id); setRenameValue(nb.name); }}
              className="p-0.5 rounded hover:bg-surface-hover text-muted"
            >✎</button>
            <button
              onClick={e => { e.stopPropagation(); if (confirm(`Delete folder "${nb.name}"?`)) deleteNotebook(nb.id); }}
              className="p-0.5 rounded hover:bg-surface-hover text-red-400"
            >✕</button>
          </div>
        </div>
        {addingSubFolderParentId === nb.id && (
          <div className="flex items-center gap-1 py-1" style={{ paddingLeft: `${8 + (depth + 1) * 14}px` }}>
            <Folder size={13} className="text-muted flex-shrink-0" />
            <input
              autoFocus
              value={newSubFolderName}
              onChange={e => setNewSubFolderName(e.target.value)}
              onBlur={() => { setAddingSubFolderParentId(null); setNewSubFolderName(''); }}
              onKeyDown={e => {
                if (e.key === 'Enter') handleCreateSubFolder(nb.id);
                if (e.key === 'Escape') { setAddingSubFolderParentId(null); setNewSubFolderName(''); }
              }}
              placeholder="Subfolder name..."
              className="flex-1 bg-surface-hover border border-border rounded px-1.5 py-0.5 text-sm outline-none text-fg min-w-0"
            />
          </div>
        )}
        {isExpanded && children.map(c => renderFolder(c, depth + 1))}
      </div>
    );
  };

  if (sidebarCollapsed) return null;

  return (
    <aside
      className="flex flex-col h-full bg-surface border-r border-border overflow-hidden"
      style={{ width: `${settings.sidebarWidth}px`, minWidth: `${settings.sidebarWidth}px` }}
    >
      {/* Logo */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2 flex-shrink-0">
        <div className="w-6 h-6 rounded bg-accent flex items-center justify-center">
          <FileText size={13} className="text-accent-fg" />
        </div>
        <span className="font-semibold text-sm text-fg tracking-tight">NoteVault</span>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-2 space-y-0.5">
        {/* Main Nav */}
        <div className="space-y-0.5">
          {navItem('all', 'All Notes', <FileText size={14} />, activeNotes.length)}
          {navItem('recent', 'Recent', <Clock size={14} />)}
          {navItem('favorites', 'Favorites', <Star size={14} />, activeNotes.filter(n => n.isFavorite).length)}
        </div>

        <div className="border-t border-border my-2" />

        {/* Folders */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Folders</span>
            <button
              onClick={() => setAddingFolder(true)}
              className="p-0.5 rounded hover:bg-surface-hover text-muted hover:text-fg transition-colors"
              title="New folder"
            >
              <Plus size={13} />
            </button>
          </div>

          {/* Root drop zone — drag folder here to make it a root folder */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOverRoot(true); setDragOverId(null); }}
            onDragLeave={() => setDragOverRoot(false)}
            onDrop={e => { e.preventDefault(); handleFolderDrop(null); }}
            className={cn(
              'rounded-md transition-colors mb-0.5',
              dragOverRoot && draggingId ? 'bg-accent/10 ring-1 ring-accent/40 h-5' : 'h-0'
            )}
          />

          {rootFolders.map(nb => renderFolder(nb))}
          {addingFolder && (
            <div className="flex items-center gap-1 px-2 py-1">
              <Folder size={13} className="text-muted flex-shrink-0" />
              <input
                autoFocus
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onBlur={() => { setAddingFolder(false); setNewFolderName(''); }}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCreateFolder();
                  if (e.key === 'Escape') { setAddingFolder(false); setNewFolderName(''); }
                }}
                placeholder="Folder name..."
                className="flex-1 bg-surface-hover border border-border rounded px-1.5 py-0.5 text-sm outline-none text-fg min-w-0"
              />
            </div>
          )}
          {rootFolders.length === 0 && !addingFolder && (
            <p className="text-xs text-muted px-2 py-1 italic">No folders yet</p>
          )}
        </div>

        <div className="border-t border-border my-2" />

        {/* Tags */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Tags</span>
          </div>
          <div className="space-y-0.5">
            {tags.map(tag => {
              const count = tagCounts.get(tag.id) ?? 0;
              const isActive = activeTagId === tag.id;
              return (
                <button
                  key={tag.id}
                  onClick={() => { setActiveTag(tag.id); setSidebarView('tags'); setActiveNotebook(null); }}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-1 rounded-md text-sm transition-colors group',
                    isActive
                      ? 'bg-accent text-accent-fg font-medium'
                      : 'text-muted hover:text-fg hover:bg-surface-hover'
                  )}
                >
                  <Hash size={12} className="flex-shrink-0" />
                  <span className="flex-1 text-left truncate">{tag.name}</span>
                  <span className="text-xs opacity-50">{count || ''}</span>
                </button>
              );
            })}
            {tags.length === 0 && (
              <p className="text-xs text-muted px-2 py-1 italic">No tags yet</p>
            )}
          </div>
        </div>

        <div className="border-t border-border my-2" />

        {navItem('trash', 'Trash', <Trash2 size={14} />, trashCount)}
      </div>

      {/* Bottom actions */}
      <div className="border-t border-border px-2 py-2 flex gap-1 flex-shrink-0">
        <button
          onClick={() => { setShowResetConfirm(true); setResetStep(1); }}
          className="p-1.5 rounded-md text-xs text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
          title="Reset all data"
        >
          <RotateCcw size={13} />
        </button>
        <button
          onClick={() => setShowShortcuts(true)}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs text-muted hover:text-fg hover:bg-surface-hover transition-colors"
          title="Keyboard shortcuts"
        >
          <Keyboard size={13} />
          Shortcuts
        </button>
        <button
          onClick={() => setShowSettings(true)}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs text-muted hover:text-fg hover:bg-surface-hover transition-colors"
          title="Settings"
        >
          <Settings size={13} />
          Settings
        </button>
      </div>

      {/* Reset All confirm modal */}
      {showResetConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => { setShowResetConfirm(false); setResetStep(1); }}
        >
          <div
            className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-sm mx-4 p-5"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 mx-auto mb-3">
              <RotateCcw size={22} className="text-red-500" />
            </div>
            {resetStep === 1 ? (
              <>
                <h3 className="font-semibold text-fg text-center mb-1">Reset all data?</h3>
                <p className="text-xs text-muted text-center mb-4">
                  This will <strong className="text-red-400">permanently delete</strong> all notes, folders, tags and attachments. This action cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowResetConfirm(false); setResetStep(1); }}
                    className="flex-1 py-2 rounded-lg border border-border text-sm text-fg hover:bg-surface-hover transition-colors"
                  >Cancel</button>
                  <button
                    onClick={() => setResetStep(2)}
                    className="flex-1 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30 transition-colors"
                  >Continue →</button>
                </div>
              </>
            ) : (
              <>
                <h3 className="font-semibold text-fg text-center mb-1">Are you absolutely sure?</h3>
                <p className="text-xs text-muted text-center mb-4">
                  All your data will be <strong className="text-red-500">wiped completely</strong> and cannot be recovered. Export a backup first if needed.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowResetConfirm(false); setResetStep(1); }}
                    className="flex-1 py-2 rounded-lg border border-border text-sm text-fg hover:bg-surface-hover transition-colors"
                  >Cancel</button>
                  <button
                    onClick={handleResetAll}
                    disabled={resetting}
                    className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm hover:bg-red-600 transition-colors disabled:opacity-50"
                  >{resetting ? 'Resetting…' : 'Yes, Reset Everything'}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
