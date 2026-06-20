import React, { useRef, useState } from 'react';
import { Upload, X, FolderOpen, AlertCircle, CheckCircle, Trash2, PlusCircle } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import {
  readFileAsText, parseMarkdownFile, parseJsonBackup,
  resolveOrCreateFolderPath
} from '../../utils/importExport';
import { cn } from '../../utils/cn';
import { db } from '../../db/database';
import type { ImportResult } from '../../types';

interface Props {
  onClose: () => void;
}

type ImportMode = 'merge' | 'replace';

export function ImportModal({ onClose }: Props) {
  const {
    createNote, createTag, addTagToNote, createNotebook,
    notes, notebooks, loadAll, deleteNote, permanentlyDeleteNote
  } = useAppStore();

  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<ImportMode>('merge');
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Get latest notebooks from store at call time (inside async fn)
  const getNotebooks = () => useAppStore.getState().notebooks;

  const doImportMarkdown = async (files: File[]) => {
    setLoading(true);
    let imported = 0, skipped = 0;
    const errors: string[] = [];
    const currentNotes = useAppStore.getState().notes;

    for (const file of files) {
      try {
        const content = await readFileAsText(file);
        const { note: noteData, tagNames, folderPath } = parseMarkdownFile(content, file.name);

        // Skip duplicates only in merge mode
        if (mode === 'merge') {
          const exists = currentNotes.find(n => n.title.toLowerCase() === noteData.title.toLowerCase() && n.status !== 'trash');
          if (exists) { skipped++; continue; }
        }

        // Resolve folder
        let notebookId: string | null = null;
        if (folderPath) {
          notebookId = await resolveOrCreateFolderPath(folderPath, getNotebooks(), createNotebook);
        }

        const note = await createNote({ ...noteData, notebookId });

        for (const tagName of tagNames) {
          const tag = await createTag(tagName);
          await addTagToNote(note.id, tag.id);
        }
        imported++;
      } catch (e) {
        errors.push(`${file.name}: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
    }

    setResult({ imported, skipped, errors });
    setLoading(false);
    await loadAll();
  };

  const doImportJson = async (file: File) => {
    setLoading(true);
    try {
      const content = await readFileAsText(file);
      const backup = parseJsonBackup(content);
      if (!backup) throw new Error('Invalid JSON backup format');

      let imported = 0, skipped = 0;
      const errors: string[] = [];
      const currentNotes = useAppStore.getState().notes;

      // Reconstruct notebook tree preserving parent-child order (parents first)
      const notebookMap = new Map<string, string>(); // old id → new id
      const sorted = topologicalSortNotebooks(backup.notebooks);
      for (const nb of sorted) {
        try {
          const newParentId = nb.parentId ? (notebookMap.get(nb.parentId) ?? null) : null;
          const created = await createNotebook(nb.name, newParentId);
          if (created) notebookMap.set(nb.id, created.id);
        } catch { /* skip */ }
      }

      // Import tags
      const tagMap = new Map<string, string>();
      for (const tag of backup.tags) {
        try {
          const created = await createTag(tag.name, tag.color);
          tagMap.set(tag.id, created.id);
        } catch { /* skip */ }
      }

      // Import notes
      for (const note of backup.notes) {
        try {
          if (mode === 'merge') {
            const exists = currentNotes.find(n => n.title.toLowerCase() === note.title.toLowerCase() && n.status !== 'trash');
            if (exists) { skipped++; continue; }
          }

          const newNote = await createNote({
            title: note.title,
            contentMd: note.contentMd,
            notebookId: note.notebookId ? (notebookMap.get(note.notebookId) ?? null) : null,
            status: note.status,
            isPinned: note.isPinned,
            isFavorite: note.isFavorite,
            source: note.source,
          });

          for (const oldTagId of note.tags) {
            const newTagId = tagMap.get(oldTagId);
            if (newTagId) await addTagToNote(newNote.id, newTagId);
          }
          imported++;
        } catch (e) {
          errors.push(`${note.title}: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
      }

      setResult({ imported, skipped, errors });
      await loadAll();
    } catch (e) {
      setResult({ imported: 0, skipped: 0, errors: [e instanceof Error ? e.message : 'Import failed'] });
    }
    setLoading(false);
  };

  const runImport = async (files: File[]) => {
    const mdFiles = files.filter(f => f.name.endsWith('.md') || f.name.endsWith('.markdown'));
    const jsonFiles = files.filter(f => f.name.endsWith('.json'));

    if (jsonFiles.length > 0) {
      await doImportJson(jsonFiles[0]);
    } else if (mdFiles.length > 0) {
      await doImportMarkdown(mdFiles);
    } else {
      setResult({ imported: 0, skipped: 0, errors: ['No supported files found (.md or .json)'] });
    }
  };

  const handleFiles = async (files: FileList | File[]) => {
    const fileArr = Array.from(files);
    if (mode === 'replace') {
      setPendingFiles(fileArr);
      setConfirmReplace(true);
    } else {
      await runImport(fileArr);
    }
  };

  const handleConfirmReplace = async () => {
    setConfirmReplace(false);
    if (!pendingFiles) return;
    setLoading(true);
    // Permanently delete all existing notes
    const allNotes = useAppStore.getState().notes;
    for (const note of allNotes) {
      await permanentlyDeleteNote(note.id);
    }
    // Delete all notebooks & tags
    const allNotebooks = useAppStore.getState().notebooks;
    for (const nb of allNotebooks) {
      try { await db.notebooks.delete(nb.id); } catch { /* ignore */ }
    }
    await db.tags.clear();
    await loadAll();
    setLoading(false);
    await runImport(pendingFiles);
    setPendingFiles(null);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    await handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-surface rounded-xl border border-border shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-fg flex items-center gap-2">
            <Upload size={16} className="text-accent" /> Import Notes
          </h2>
          <button onClick={onClose} className="text-muted hover:text-fg transition-colors"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          {!result && !confirmReplace ? (
            <>
              {/* Import mode */}
              <div>
                <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Import Mode</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setMode('merge')}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg border text-sm transition-colors',
                      mode === 'merge'
                        ? 'border-accent bg-accent/5 text-accent'
                        : 'border-border text-muted hover:border-accent/40 hover:bg-surface-hover'
                    )}
                  >
                    <PlusCircle size={14} /> Merge
                  </button>
                  <button
                    onClick={() => setMode('replace')}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg border text-sm transition-colors',
                      mode === 'replace'
                        ? 'border-red-400 bg-red-400/5 text-red-400'
                        : 'border-border text-muted hover:border-red-400/40 hover:bg-surface-hover'
                    )}
                  >
                    <Trash2 size={14} /> Replace All
                  </button>
                </div>
                <p className="text-xs text-muted mt-1.5">
                  {mode === 'merge'
                    ? 'Add imported notes alongside existing ones. Duplicates (by title) are skipped.'
                    : 'Delete ALL existing notes, folders and tags before importing.'}
                </p>
              </div>

              {/* Drop zone */}
              <div
                className={cn(
                  'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
                  dragging ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50 hover:bg-surface-hover'
                )}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                {loading ? (
                  <div className="flex flex-col items-center gap-2 text-muted">
                    <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm">Importing...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted">
                    <Upload size={28} className="opacity-40" />
                    <p className="text-sm font-medium text-fg">Drop files here or click to browse</p>
                    <p className="text-xs">Supports .md, .markdown files and JSON backups</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file" multiple accept=".md,.markdown,.json"
                  className="hidden"
                  onChange={e => e.target.files && handleFiles(e.target.files)}
                />
              </div>

              <button
                onClick={() => folderInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-2.5 border border-border rounded-lg text-sm text-muted hover:text-fg hover:bg-surface-hover hover:border-accent/50 transition-colors"
              >
                <FolderOpen size={15} /> Import Markdown Folder
              </button>
              <input
                ref={folderInputRef}
                type="file" multiple
                // @ts-ignore
                webkitdirectory=""
                accept=".md,.markdown"
                className="hidden"
                onChange={e => e.target.files && handleFiles(e.target.files)}
              />

              <div className="bg-surface-hover rounded-lg p-3">
                <p className="text-xs text-muted font-medium mb-1">Supported formats:</p>
                <ul className="text-xs text-muted space-y-0.5">
                  <li>• <strong className="text-fg">JSON Backup</strong> — restores folders, tags &amp; all metadata</li>
                  <li>• <strong className="text-fg">Markdown</strong> (.md) — folder path restored from frontmatter</li>
                  <li>• <strong className="text-fg">Folder</strong> — imports entire markdown folder</li>
                </ul>
              </div>
            </>
          ) : confirmReplace ? (
            /* Replace confirm */
            <div className="space-y-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 mx-auto">
                <Trash2 size={22} className="text-red-500" />
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-fg mb-1">Replace all existing data?</h3>
                <p className="text-xs text-muted">All current notes, folders and tags will be <strong className="text-red-400">permanently deleted</strong> before importing. This cannot be undone.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setConfirmReplace(false); setPendingFiles(null); }}
                  className="flex-1 py-2 rounded-lg border border-border text-sm text-fg hover:bg-surface-hover transition-colors"
                >Cancel</button>
                <button
                  onClick={handleConfirmReplace}
                  className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm hover:bg-red-600 transition-colors"
                >Yes, Replace</button>
              </div>
            </div>
          ) : (
            /* Result */
            <div className="space-y-3">
              <div className={cn(
                'flex items-center gap-2 p-3 rounded-lg',
                result!.errors.length > 0 ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-green-50 dark:bg-green-900/20'
              )}>
                {result!.errors.length > 0
                  ? <AlertCircle size={18} className="text-amber-500 flex-shrink-0" />
                  : <CheckCircle size={18} className="text-green-500 flex-shrink-0" />
                }
                <div>
                  <p className="text-sm font-medium text-fg">Import complete</p>
                  <p className="text-xs text-muted">
                    {result!.imported} imported, {result!.skipped} skipped
                    {result!.errors.length > 0 ? `, ${result!.errors.length} errors` : ''}
                  </p>
                </div>
              </div>
              {result!.errors.length > 0 && (
                <div className="bg-surface-hover rounded-lg p-3 max-h-32 overflow-y-auto">
                  {result!.errors.map((e, i) => <p key={i} className="text-xs text-red-500">{e}</p>)}
                </div>
              )}
              <button onClick={onClose} className="btn-primary w-full">Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Topological sort notebooks: parents before children ─────────────────────
function topologicalSortNotebooks(notebooks: { id: string; parentId?: string | null; name: string }[]) {
  const result: typeof notebooks = [];
  const visited = new Set<string>();
  const visit = (nb: typeof notebooks[0]) => {
    if (visited.has(nb.id)) return;
    if (nb.parentId) {
      const parent = notebooks.find(n => n.id === nb.parentId);
      if (parent) visit(parent);
    }
    visited.add(nb.id);
    result.push(nb);
  };
  notebooks.forEach(visit);
  return result;
}
