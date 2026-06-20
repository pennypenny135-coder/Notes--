import React, { useState } from 'react';
import {
  Star, Clock, Trash2, FileText,
  ChevronRight, ChevronDown, Plus,
  Folder, Settings, Keyboard, Hash
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { cn } from '../../utils/cn';
import type { SidebarView } from '../../types';


export function Sidebar() {
  const {
    notes, notebooks, tags, sidebarView, activeNotebookId, activeTagId,
    sidebarCollapsed, setSidebarView, setActiveNotebook, setActiveTag,
    createNotebook, deleteNotebook, updateNotebook,
    setShowSettings, setShowShortcuts,
    settings,
  } = useAppStore();

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [newFolderName, setNewFolderName] = useState('');
  const [addingFolder, setAddingFolder] = useState(false);
  const [addingSubFolderParentId, setAddingSubFolderParentId] = useState<string | null>(null);
  const [newSubFolderName, setNewSubFolderName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const trashCount = notes.filter(n => n.status === 'trash').length;
  const activeNotes = notes.filter(n => n.status !== 'trash');

  const tagCounts = new Map<string, number>();
  activeNotes.forEach(n => n.tags.forEach(tid => tagCounts.set(tid, (tagCounts.get(tid) ?? 0) + 1)));

  const navItem = (
    view: SidebarView,
    label: string,
    icon: React.ReactNode,
    count?: number,
    extraAction?: () => void
  ) => (
    <button
      key={view}
      onClick={() => { setSidebarView(view); setActiveNotebook(null); setActiveTag(null); extraAction?.(); }}
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
    // Auto-expand parent
    setExpandedFolders(s => { const n = new Set(s); n.add(parentId); return n; });
  };

  const handleRenameFolder = async (id: string) => {
    if (!renameValue.trim()) return;
    await updateNotebook(id, { name: renameValue.trim() });
    setRenamingId(null);
  };

  // Helper: get folder depth (root = 1)
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

  const rootFolders = notebooks.filter(n => !n.parentId);
  const childFolders = (parentId: string) => notebooks.filter(n => n.parentId === parentId);

  const renderFolder = (nb: typeof notebooks[0], depth = 0) => {
    const children = childFolders(nb.id);
    const hasChildren = children.length > 0 || addingSubFolderParentId === nb.id;
    const isExpanded = expandedFolders.has(nb.id);
    const isActive = activeNotebookId === nb.id;
    const noteCount = activeNotes.filter(n => n.notebookId === nb.id).length;
    const currentDepth = getFolderDepth(nb.id); // 1, 2, or 3
    const canAddSubFolder = currentDepth < 3;

    return (
      <div key={nb.id}>
        <div
          className={cn(
            'group flex items-center gap-1 px-2 py-1 rounded-md cursor-pointer text-sm transition-colors',
            isActive
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
          {(hasChildren || children.length > 0) ? (
            <button
              onClick={e => { e.stopPropagation(); setExpandedFolders(s => { const n = new Set(s); n.has(nb.id) ? n.delete(nb.id) : n.add(nb.id); return n; }); }}
              className="flex-shrink-0 w-3 h-3"
            >
              {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
          ) : (
            <span className="w-3" />
          )}
          <Folder size={13} className="flex-shrink-0" />
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
        {/* Subfolder creation input */}
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

        {/* Trash */}
        {navItem('trash', 'Trash', <Trash2 size={14} />, trashCount)}
      </div>

      {/* Bottom actions */}
      <div className="border-t border-border px-2 py-2 flex gap-1 flex-shrink-0">
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
    </aside>
  );
}
