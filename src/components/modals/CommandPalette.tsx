import { useState, useEffect, useRef } from 'react';
import { Search, FileText, Plus, Star, Hash, Trash2, Upload, Download, Calendar } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { cn } from '../../utils/cn';
import { getDailyNoteTitle } from '../../utils/text';

interface Props {
  onClose: () => void;
  onImport: () => void;
  onExport: () => void;
}

interface Command {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
  category: string;
}

export function CommandPalette({ onClose, onImport, onExport }: Props) {
  const { notes, createNote, setActiveNote, setSidebarView, setActiveTag, tags } = useAppStore();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleNewNote = async () => {
    const note = await createNote();
    await setActiveNote(note.id);
    onClose();
  };

  const handleDailyNote = async () => {
    const title = getDailyNoteTitle();
    const existing = notes.find(n => n.title === title && n.status !== 'trash');
    if (existing) {
      await setActiveNote(existing.id);
    } else {
      const note = await createNote({ title });
      await setActiveNote(note.id);
    }
    onClose();
  };

  const baseCommands: Command[] = [
    { id: 'new', label: 'New Note', icon: <Plus size={14} />, action: handleNewNote, category: 'Actions' },
    { id: 'daily', label: "Today's Daily Note", icon: <Calendar size={14} />, action: handleDailyNote, category: 'Actions' },
    { id: 'favorites', label: 'Go to Favorites', icon: <Star size={14} />, action: () => { setSidebarView('favorites'); onClose(); }, category: 'Navigate' },
    { id: 'import', label: 'Import Notes', icon: <Upload size={14} />, action: () => { onImport(); onClose(); }, category: 'Actions' },
    { id: 'export', label: 'Export Notes', icon: <Download size={14} />, action: () => { onExport(); onClose(); }, category: 'Actions' },
    { id: 'trash', label: 'View Trash', icon: <Trash2 size={14} />, action: () => { setSidebarView('trash'); onClose(); }, category: 'Navigate' },
  ];

  // Note results
  const noteResults: Command[] = query.length > 0
    ? notes
        .filter(n => n.status !== 'trash' && n.title.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 8)
        .map(n => ({
          id: `note-${n.id}`,
          label: n.title,
          icon: <FileText size={14} />,
          action: async () => { await setActiveNote(n.id); onClose(); },
          category: 'Notes',
        }))
    : [];

  // Tag results
  const tagResults: Command[] = query.startsWith('#')
    ? tags
        .filter(t => t.name.toLowerCase().includes(query.slice(1).toLowerCase()))
        .slice(0, 5)
        .map(t => ({
          id: `tag-${t.id}`,
          label: `#${t.name}`,
          icon: <Hash size={14} />,
          action: () => { setActiveTag(t.id); setSidebarView('tags'); onClose(); },
          category: 'Tags',
        }))
    : [];

  const filteredBase = query
    ? baseCommands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()))
    : baseCommands;

  const all = [...noteResults, ...tagResults, ...filteredBase];
  const grouped = all.reduce((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, Command[]>);

  const flat = Object.values(grouped).flat();

  useEffect(() => { setSelected(0); }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, flat.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    if (e.key === 'Enter' && flat[selected]) { flat[selected].action(); }
    if (e.key === 'Escape') onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-surface rounded-xl border border-border shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Search size={16} className="text-muted flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search notes or type a command..."
            className="flex-1 bg-transparent outline-none text-fg placeholder-muted text-sm"
          />
          <kbd className="text-xs text-muted bg-surface-hover px-1.5 py-0.5 rounded border border-border">esc</kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-1">
          {flat.length === 0 && (
            <p className="text-sm text-muted text-center py-6">No results</p>
          )}
          {Object.entries(grouped).map(([category, cmds]) => (
            <div key={category}>
              <p className="text-[10px] font-semibold text-muted uppercase tracking-wider px-4 py-1.5">
                {category}
              </p>
              {cmds.map(cmd => {
                const idx = flat.indexOf(cmd);
                return (
                  <button
                    key={cmd.id}
                    onClick={cmd.action}
                    onMouseEnter={() => setSelected(idx)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2 text-sm text-left transition-colors',
                      idx === selected ? 'bg-accent/10 text-fg' : 'text-fg hover:bg-surface-hover'
                    )}
                  >
                    <span className="text-muted">{cmd.icon}</span>
                    {cmd.label}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
