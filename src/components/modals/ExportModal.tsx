import React, { useState } from 'react';
import { Download, X, FileText, Code, Archive, Check } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import {
  exportNoteAsMarkdown, exportAsJson, exportAsZip,
  downloadText
} from '../../utils/importExport';
import { cn } from '../../utils/cn';
import { db } from '../../db/database';

interface Props {
  onClose: () => void;
}

type ExportFormat = 'markdown' | 'json' | 'zip';

export function ExportModal({ onClose }: Props) {
  const { notes, notebooks, tags, activeNoteId } = useAppStore();
  const [format, setFormat] = useState<ExportFormat>('markdown');
  const [scope, setScope] = useState<'active' | 'all'>('all');
  const [includeAttachments, setIncludeAttachments] = useState(true);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const activeNotes = notes.filter(n => n.status !== 'trash');
  const tagMap = new Map(tags.map(t => [t.id, t.name]));

  const handleExport = async () => {
    setLoading(true);
    try {
      const targetNotes = scope === 'active'
        ? activeNotes.filter(n => n.id === activeNoteId)
        : activeNotes;

      if (format === 'markdown') {
        if (targetNotes.length === 1) {
          const note = targetNotes[0];
          const tagNames = note.tags.map(id => tagMap.get(id) ?? id);
          const content = includeMetadata
            ? exportNoteAsMarkdown(note, tagNames)
            : note.contentMd;
          downloadText(content, `${note.title.replace(/[<>:"/\\|?*]/g, '_')}.md`);
        } else {
          // Multiple notes: zip of markdown files
          const JSZip = (await import('jszip')).default;
          const zip = new JSZip();
          for (const note of targetNotes) {
            const tagNames = note.tags.map(id => tagMap.get(id) ?? id);
            const content = includeMetadata
              ? exportNoteAsMarkdown(note, tagNames)
              : note.contentMd;
            const safeName = note.title.replace(/[<>:"/\\|?*]/g, '_').slice(0, 100);
            zip.file(`${safeName}.md`, content);
          }
          const blob = await zip.generateAsync({ type: 'blob' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'notevault-export.zip';
          a.click();
          URL.revokeObjectURL(url);
        }
      } else if (format === 'json') {
        const allAttachments = await db.attachments.toArray();
        const content = exportAsJson(targetNotes, notebooks, tags, includeAttachments ? allAttachments : []);
        downloadText(content, 'notevault-backup.json', 'application/json');
      } else if (format === 'zip') {
        const allAttachments = includeAttachments ? await db.attachments.toArray() : [];
        const blob = await exportAsZip(targetNotes, notebooks, tags, allAttachments, includeAttachments);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'notevault-export.zip';
        a.click();
        URL.revokeObjectURL(url);
      }

      setDone(true);
      setTimeout(() => { setDone(false); onClose(); }, 1500);
    } catch (e) {
      alert(`Export failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
    setLoading(false);
  };

  const formatOptions: { value: ExportFormat; label: string; desc: string; icon: React.ReactNode }[] = [
    {
      value: 'markdown',
      label: 'Markdown',
      desc: 'Plain .md files — works with any editor',
      icon: <FileText size={18} />,
    },
    {
      value: 'json',
      label: 'JSON Backup',
      desc: 'Full backup including metadata & tags',
      icon: <Code size={18} />,
    },
    {
      value: 'zip',
      label: 'ZIP Archive',
      desc: 'Notes + attachments in one archive',
      icon: <Archive size={18} />,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-surface rounded-xl border border-border shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-fg flex items-center gap-2">
            <Download size={16} className="text-accent" /> Export Notes
          </h2>
          <button onClick={onClose} className="text-muted hover:text-fg transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Format */}
          <div>
            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Format</p>
            <div className="space-y-2">
              {formatOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setFormat(opt.value)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left',
                    format === opt.value
                      ? 'border-accent bg-accent/5 text-fg'
                      : 'border-border hover:border-accent/40 hover:bg-surface-hover text-fg'
                  )}
                >
                  <span className={cn('flex-shrink-0', format === opt.value ? 'text-accent' : 'text-muted')}>
                    {opt.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-xs text-muted">{opt.desc}</p>
                  </div>
                  {format === opt.value && <Check size={16} className="text-accent flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Scope */}
          <div>
            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Scope</p>
            <div className="flex gap-2">
              <button
                onClick={() => setScope('all')}
                className={cn(
                  'flex-1 py-2 rounded-md text-sm border transition-colors',
                  scope === 'all' ? 'border-accent bg-accent/5 text-accent' : 'border-border text-muted hover:border-accent/40'
                )}
              >
                All notes ({activeNotes.length})
              </button>
              {activeNoteId && (
                <button
                  onClick={() => setScope('active')}
                  className={cn(
                    'flex-1 py-2 rounded-md text-sm border transition-colors',
                    scope === 'active' ? 'border-accent bg-accent/5 text-accent' : 'border-border text-muted hover:border-accent/40'
                  )}
                >
                  Current note
                </button>
              )}
            </div>
          </div>

          {/* Options */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeMetadata}
                onChange={e => setIncludeMetadata(e.target.checked)}
                className="accent-accent"
              />
              <span className="text-sm text-fg">Include frontmatter metadata</span>
            </label>
            {(format === 'json' || format === 'zip') && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeAttachments}
                  onChange={e => setIncludeAttachments(e.target.checked)}
                  className="accent-accent"
                />
                <span className="text-sm text-fg">Include attachments</span>
              </label>
            )}
          </div>

          {/* Export button */}
          <button
            onClick={handleExport}
            disabled={loading || done}
            className={cn(
              'btn-primary w-full flex items-center justify-center gap-2 py-2.5',
              done && 'bg-green-500 hover:bg-green-500'
            )}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : done ? (
              <><Check size={16} /> Exported!</>
            ) : (
              <><Download size={16} /> Export</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
