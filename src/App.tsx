import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from './store/useAppStore';
import { Sidebar } from './components/layout/Sidebar';
import { NoteList } from './components/layout/NoteList';
import { NoteEditor } from './components/editor/NoteEditor';
import { TopBar } from './components/layout/TopBar';
import { TrashView } from './components/layout/TrashView';
import { ImportModal } from './components/modals/ImportModal';
import { ExportModal } from './components/modals/ExportModal';
import { SettingsModal } from './components/modals/SettingsModal';
import { ShortcutsModal } from './components/modals/ShortcutsModal';
import { CommandPalette } from './components/modals/CommandPalette';
import { AttachmentPanel } from './components/editor/AttachmentPanel';

type ModalType = 'import' | 'export' | 'settings' | 'shortcuts' | 'command' | null;

function App() {
  const {
    loadAll, settings,
    showSettings, showShortcuts, showCommandPalette,
    setShowSettings, setShowShortcuts, setShowCommandPalette,
    sidebarView, createNote, setActiveNote, activeNoteId,
    toggleSidebar,
  } = useAppStore();

  const [modal, setModal] = useState<ModalType>(null);

  // Load data on mount
  useEffect(() => {
    loadAll();
  }, []);

  // Apply theme
  useEffect(() => {
    const applyTheme = (dark: boolean) => {
      document.documentElement.classList.toggle('dark', dark);
    };
    if (settings.theme === 'dark') applyTheme(true);
    else if (settings.theme === 'light') applyTheme(false);
    else {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(mq.matches);
      const handler = (e: MediaQueryListEvent) => applyTheme(e.matches);
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, [settings.theme]);

  // Global keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const ctrl = e.ctrlKey || e.metaKey;
    const target = e.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

    if (ctrl && e.key === 'n') {
      e.preventDefault();
      createNote().then(n => setActiveNote(n.id));
    }
    if (ctrl && e.key === '\\') {
      e.preventDefault();
      toggleSidebar();
    }
    if (ctrl && e.key === 'k') {
      e.preventDefault();
      setShowCommandPalette(true);
    }
    if (ctrl && e.key === '/') {
      e.preventDefault();
      setShowShortcuts(true);
    }
    if (ctrl && e.key === 'f' && !isInput) {
      e.preventDefault();
      // Focus search
      const searchEl = document.querySelector<HTMLInputElement>('input[placeholder*="Search"]');
      searchEl?.focus();
    }
    if (e.key === 'Escape') {
      if (showCommandPalette) setShowCommandPalette(false);
      if (showSettings) setShowSettings(false);
      if (showShortcuts) setShowShortcuts(false);
      if (modal) setModal(null);
    }
    if (ctrl && e.shiftKey && e.key === 'E') {
      e.preventDefault();
      setModal('export');
    }
    if (ctrl && e.shiftKey && e.key === 'I') {
      e.preventDefault();
      setModal('import');
    }
  }, [showCommandPalette, showSettings, showShortcuts, modal, createNote, setActiveNote, toggleSidebar, setShowCommandPalette, setShowShortcuts, setShowSettings]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const isTrashView = sidebarView === 'trash';

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-bg text-fg">
      {/* Top bar */}
      <TopBar
        onImport={() => setModal('import')}
        onExport={() => setModal('export')}
      />

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* Note list + editor */}
        {isTrashView ? (
          <TrashView />
        ) : (
          <>
            <NoteList />
            <div className="flex flex-col flex-1 overflow-hidden min-w-0">
              <NoteEditor />
              {activeNoteId && (
                <AttachmentPanel noteId={activeNoteId} />
              )}
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      {modal === 'import' && <ImportModal onClose={() => setModal(null)} />}
      {modal === 'export' && <ExportModal onClose={() => setModal(null)} />}
      {(showSettings || modal === 'settings') && (
        <SettingsModal onClose={() => { setShowSettings(false); setModal(null); }} />
      )}
      {(showShortcuts || modal === 'shortcuts') && (
        <ShortcutsModal onClose={() => { setShowShortcuts(false); setModal(null); }} />
      )}
      {showCommandPalette && (
        <CommandPalette
          onClose={() => setShowCommandPalette(false)}
          onImport={() => { setModal('import'); setShowCommandPalette(false); }}
          onExport={() => { setModal('export'); setShowCommandPalette(false); }}
        />
      )}
    </div>
  );
}

export default App;
