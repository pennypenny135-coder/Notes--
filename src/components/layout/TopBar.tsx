import { useRef, useState } from 'react';
import {
  Search, Plus, Upload, Download, PanelLeft,
  SortAsc, SortDesc, X, Columns
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { cn } from '../../utils/cn';
import { getDailyNoteTitle } from '../../utils/text';
import type { SortOrder } from '../../types';

interface Props {
  onImport: () => void;
  onExport: () => void;
}

export function TopBar({ onImport, onExport }: Props) {
  const {
    searchFilter, setSearchFilter, createNote, setActiveNote,
    toggleSidebar, toggleList, sidebarCollapsed, listCollapsed,
    sortOrder, sortDir, setSortOrder,
    notes,
  } = useAppStore();

  const [showSort, setShowSort] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const handleNewNote = async () => {
    const note = await createNote();
    await setActiveNote(note.id);
  };

  const _handleDailyNote = async () => {
    const title = getDailyNoteTitle();
    const existing = notes.find(n => n.title === title && n.status !== 'trash');
    if (existing) {
      await setActiveNote(existing.id);
    } else {
      const note = await createNote({ title });
      await setActiveNote(note.id);
    }
  };
  void _handleDailyNote;

  const sortOptions: { value: SortOrder; label: string }[] = [
    { value: 'updatedAt', label: 'Last modified' },
    { value: 'createdAt', label: 'Date created' },
    { value: 'title', label: 'Title' },
    { value: 'wordCount', label: 'Word count' },
  ];

  const clearSearch = () => {
    setSearchFilter({ query: '' });
    searchRef.current?.focus();
  };

  return (
    <div className="h-12 flex items-center gap-2 px-3 border-b border-border bg-surface flex-shrink-0">
      {/* Sidebar toggle */}
      <button
        onClick={toggleSidebar}
        title="Toggle sidebar (Ctrl+\\)"
        className={cn(
          'p-1.5 rounded transition-colors flex-shrink-0',
          sidebarCollapsed ? 'text-accent' : 'text-muted hover:text-fg hover:bg-surface-hover'
        )}
      >
        <PanelLeft size={16} />
      </button>

      {/* List toggle */}
      <button
        onClick={toggleList}
        title="Toggle list"
        className={cn(
          'p-1.5 rounded transition-colors flex-shrink-0',
          listCollapsed ? 'text-accent' : 'text-muted hover:text-fg hover:bg-surface-hover'
        )}
      >
        <Columns size={16} />
      </button>

      {/* Search */}
      <div className="flex-1 relative max-w-lg">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
        <input
          ref={searchRef}
          value={searchFilter.query}
          onChange={e => setSearchFilter({ query: e.target.value })}
          placeholder="Search notes… (tag:xxx title:xxx)"
          className="w-full pl-8 pr-7 py-1.5 bg-surface-hover border border-border rounded-md text-sm text-fg placeholder-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-colors"
        />
        {searchFilter.query && (
          <button
            onClick={clearSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-fg"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Sort */}
      <div className="relative flex-shrink-0">
        <button
          onClick={() => setShowSort(s => !s)}
          title="Sort"
          className="flex items-center gap-1 p-1.5 rounded text-muted hover:text-fg hover:bg-surface-hover transition-colors text-xs"
        >
          {sortDir === 'desc' ? <SortDesc size={15} /> : <SortAsc size={15} />}
        </button>
        {showSort && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowSort(false)} />
            <div className="absolute right-0 top-full mt-1 z-20 bg-surface border border-border rounded-lg shadow-lg py-1 min-w-[160px]">
              {sortOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => {
                    if (sortOrder === opt.value) {
                      setSortOrder(opt.value, sortDir === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortOrder(opt.value, 'desc');
                    }
                    setShowSort(false);
                  }}
                  className={cn(
                    'w-full px-3 py-1.5 text-left text-sm hover:bg-surface-hover flex items-center justify-between gap-2',
                    sortOrder === opt.value ? 'text-accent font-medium' : 'text-fg'
                  )}
                >
                  {opt.label}
                  {sortOrder === opt.value && (
                    <span className="text-xs text-muted">{sortDir === 'desc' ? '↓' : '↑'}</span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="w-px h-5 bg-border flex-shrink-0" />

      {/* Actions */}
      <button
        onClick={handleNewNote}
        title="New note (Ctrl+N)"
        className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-sm flex-shrink-0"
      >
        <Plus size={14} />
        <span className="hidden sm:inline">New</span>
      </button>

      <button
        onClick={onImport}
        title="Import"
        className="p-1.5 rounded text-muted hover:text-fg hover:bg-surface-hover transition-colors flex-shrink-0"
      >
        <Upload size={15} />
      </button>

      <button
        onClick={onExport}
        title="Export"
        className="p-1.5 rounded text-muted hover:text-fg hover:bg-surface-hover transition-colors flex-shrink-0"
      >
        <Download size={15} />
      </button>
    </div>
  );
}
