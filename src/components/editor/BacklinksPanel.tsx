import { useState } from 'react';
import { Link2, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

interface Props {
  noteId?: string;
}

export function BacklinksPanel({ noteId: _noteId }: Props) {
  const { backlinks, outlinks, notes, setActiveNote } = useAppStore();
  const [showBacklinks, setShowBacklinks] = useState(true);
  const [showOutlinks, setShowOutlinks] = useState(true);

  const backlinkNotes = backlinks.map(bl => ({
    link: bl,
    note: notes.find(n => n.id === bl.fromNoteId),
  })).filter(x => x.note);

  const outlinkNotes = outlinks.map(ol => ({
    link: ol,
    note: notes.find(n => n.id === ol.toNoteId),
  })).filter(x => x.note);

  if (backlinkNotes.length === 0 && outlinkNotes.length === 0) return null;

  return (
    <div className="border-t border-border bg-surface flex-shrink-0 max-h-48 overflow-y-auto">
      <div className="px-4 py-2 space-y-2">
        {/* Backlinks */}
        {backlinkNotes.length > 0 && (
          <div>
            <button
              onClick={() => setShowBacklinks(s => !s)}
              className="flex items-center gap-1.5 text-xs font-semibold text-muted uppercase tracking-wider mb-1 hover:text-fg transition-colors"
            >
              {showBacklinks ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
              <Link2 size={11} /> {backlinkNotes.length} Backlink{backlinkNotes.length !== 1 ? 's' : ''}
            </button>
            {showBacklinks && (
              <div className="space-y-1 pl-4">
                {backlinkNotes.map(({ link, note }) => (
                  <button
                    key={link.id}
                    onClick={() => setActiveNote(note!.id)}
                    className="group flex items-start gap-1.5 text-xs text-muted hover:text-fg w-full text-left"
                  >
                    <ExternalLink size={10} className="flex-shrink-0 mt-0.5 opacity-50 group-hover:opacity-100" />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-fg/80 group-hover:text-fg">{note!.title}</span>
                      {link.context && (
                        <p className="text-muted truncate mt-0.5">…{link.context}…</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Outlinks */}
        {outlinkNotes.length > 0 && (
          <div>
            <button
              onClick={() => setShowOutlinks(s => !s)}
              className="flex items-center gap-1.5 text-xs font-semibold text-muted uppercase tracking-wider mb-1 hover:text-fg transition-colors"
            >
              {showOutlinks ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
              <Link2 size={11} className="rotate-180" /> {outlinkNotes.length} Outlink{outlinkNotes.length !== 1 ? 's' : ''}
            </button>
            {showOutlinks && (
              <div className="space-y-1 pl-4">
                {outlinkNotes.map(({ link, note }) => (
                  <button
                    key={link.id}
                    onClick={() => setActiveNote(note!.id)}
                    className="group flex items-center gap-1.5 text-xs text-muted hover:text-fg w-full text-left"
                  >
                    <ExternalLink size={10} className="flex-shrink-0 opacity-50 group-hover:opacity-100" />
                    <span className="font-medium text-fg/80 group-hover:text-fg">{note!.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
