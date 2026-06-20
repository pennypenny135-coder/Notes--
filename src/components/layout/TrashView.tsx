import { Trash2, RotateCcw, X } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { formatDate } from '../../utils/text';

export function TrashView() {
  const { notes, restoreNote, permanentlyDeleteNote } = useAppStore();
  const trashNotes = notes.filter(n => n.status === 'trash');

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-bg">
      <div className="px-6 py-4 border-b border-border bg-surface flex-shrink-0">
        <h2 className="font-semibold text-fg flex items-center gap-2">
          <Trash2 size={16} className="text-muted" /> Trash
        </h2>
        <p className="text-xs text-muted mt-0.5">
          {trashNotes.length} note{trashNotes.length !== 1 ? 's' : ''} in trash
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {trashNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted p-8 text-center">
            <Trash2 size={40} className="mb-3 opacity-20" />
            <p className="font-medium text-fg/50">Trash is empty</p>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {trashNotes.map(note => (
              <div
                key={note.id}
                className="flex items-center gap-3 p-3 bg-surface rounded-lg border border-border hover:border-border/80 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-fg/70 truncate">{note.title || 'Untitled'}</p>
                  <p className="text-xs text-muted">Deleted {formatDate(note.updatedAt)}</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => restoreNote(note.id)}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                    title="Restore"
                  >
                    <RotateCcw size={12} /> Restore
                  </button>
                  <button
                    onClick={() => { if (confirm('Permanently delete this note? This cannot be undone.')) permanentlyDeleteNote(note.id); }}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="Delete permanently"
                  >
                    <X size={12} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
