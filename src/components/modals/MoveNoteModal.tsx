import React, { useState } from 'react';
import { X, FolderOpen, Folder, ChevronRight, Inbox } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { cn } from '../../utils/cn';
import type { Notebook } from '../../types';

interface Props {
  noteId: string;
  onClose: () => void;
}

function buildTree(notebooks: Notebook[], parentId: string | null = null): Notebook[] {
  return notebooks
    .filter(n => (n.parentId ?? null) === parentId)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function FolderNode({
  notebook, notebooks, depth, selected, onSelect
}: {
  notebook: Notebook;
  notebooks: Notebook[];
  depth: number;
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const children = buildTree(notebooks, notebook.id);
  const isSelected = selected === notebook.id;

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer transition-colors text-sm',
          isSelected ? 'bg-accent/15 text-accent' : 'hover:bg-surface-hover text-fg'
        )}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={() => onSelect(notebook.id)}
      >
        {children.length > 0 ? (
          <button
            onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
            className="flex-shrink-0 text-muted hover:text-fg"
          >
            <ChevronRight size={13} className={cn('transition-transform', expanded && 'rotate-90')} />
          </button>
        ) : (
          <span className="w-[13px] flex-shrink-0" />
        )}
        {isSelected
          ? <FolderOpen size={14} className="flex-shrink-0 text-accent" />
          : <Folder size={14} className="flex-shrink-0 text-muted" />}
        <span className="truncate">{notebook.name}</span>
      </div>
      {expanded && children.map(child => (
        <FolderNode
          key={child.id}
          notebook={child}
          notebooks={notebooks}
          depth={depth + 1}
          selected={selected}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

export function MoveNoteModal({ noteId, onClose }: Props) {
  const { notes, notebooks, updateNote } = useAppStore();
  const note = notes.find(n => n.id === noteId);
  const [selected, setSelected] = useState<string | null>(note?.notebookId ?? null);
  const [saving, setSaving] = useState(false);

  if (!note) return null;

  const roots = buildTree(notebooks, null);

  const handleMove = async () => {
    setSaving(true);
    await updateNote(noteId, { notebookId: selected });
    setSaving(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-xl border border-border shadow-2xl w-full max-w-sm mx-4 flex flex-col"
        style={{ maxHeight: '80vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
          <h2 className="font-semibold text-fg text-sm">Move note to folder</h2>
          <button onClick={onClose} className="text-muted hover:text-fg"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {/* No folder option */}
          <div
            className={cn(
              'flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors text-sm mb-1',
              selected === null ? 'bg-accent/15 text-accent' : 'hover:bg-surface-hover text-muted'
            )}
            onClick={() => setSelected(null)}
          >
            <Inbox size={14} className="flex-shrink-0" />
            <span>No folder</span>
          </div>

          {notebooks.length === 0 ? (
            <p className="text-xs text-muted text-center py-6">No folders yet. Create a folder first.</p>
          ) : (
            roots.map(nb => (
              <FolderNode
                key={nb.id}
                notebook={nb}
                notebooks={notebooks}
                depth={0}
                selected={selected}
                onSelect={setSelected}
              />
            ))
          )}
        </div>

        <div className="px-4 py-3 border-t border-border flex gap-2 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-1.5 rounded-lg border border-border text-sm text-fg hover:bg-surface-hover transition-colors"
          >Cancel</button>
          <button
            onClick={handleMove}
            disabled={saving}
            className="flex-1 py-1.5 rounded-lg bg-accent text-white text-sm hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {saving ? 'Moving…' : 'Move here'}
          </button>
        </div>
      </div>
    </div>
  );
}
