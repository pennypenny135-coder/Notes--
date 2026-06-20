import { useCallback, useEffect, useRef, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { githubDark, githubLight } from '@uiw/codemirror-theme-github';
import { EditorView, keymap } from '@codemirror/view';
import { defaultKeymap, historyKeymap } from '@codemirror/commands';
import {
  Star, Pin, PinOff, Trash2,
  X, Plus, Hash, ChevronDown
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { MarkdownPreview } from './MarkdownPreview';
import { EditorToolbar } from './EditorToolbar';
import { BacklinksPanel } from './BacklinksPanel';
import { cn } from '../../utils/cn';
import { formatDateFull } from '../../utils/text';
import type { EditorMode } from '../../types';

export function NoteEditor() {
  const {
    notes, tags, notebooks, backlinks, outlinks,
    activeNoteId, editorMode, settings,
    updateNote, deleteNote, pinNote, favoriteNote,
    setActiveNote, setEditorMode, createNote, createTag, addTagToNote, removeTagFromNote,
  } = useAppStore();

  const note = notes.find(n => n.id === activeNoteId);
  const [localContent, setLocalContent] = useState(note?.contentMd ?? '');
  const [localTitle, setLocalTitle] = useState(note?.title ?? '');
  const [isDirty, setIsDirty] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [showMeta, setShowMeta] = useState(true);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDark = document.documentElement.classList.contains('dark');

  // Sync with active note
  useEffect(() => {
    if (note) {
      setLocalContent(note.contentMd);
      setLocalTitle(note.title);
      setIsDirty(false);
    }
  }, [activeNoteId]);

  // Autosave
  useEffect(() => {
    if (!isDirty || !activeNoteId) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      updateNote(activeNoteId, { contentMd: localContent, title: localTitle });
      setIsDirty(false);
    }, settings.autosaveInterval);
    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current); };
  }, [localContent, localTitle, isDirty, activeNoteId, settings.autosaveInterval]);

  const handleContentChange = useCallback((val: string) => {
    setLocalContent(val);
    setIsDirty(true);
  }, []);

  const handleTitleChange = (val: string) => {
    setLocalTitle(val);
    setIsDirty(true);
  };

  const handleTitleBlur = () => {
    if (activeNoteId && isDirty) {
      updateNote(activeNoteId, { contentMd: localContent, title: localTitle });
      setIsDirty(false);
    }
  };

  const handleInsert = useCallback((text: string, _offset?: number) => {
    setLocalContent(prev => prev + text);
    setIsDirty(true);
  }, []);

  const handleWikiLinkClick = useCallback((title: string, noteId?: string) => {
    if (noteId) {
      setActiveNote(noteId);
    } else {
      if (confirm(`Note "${title}" doesn't exist. Create it?`)) {
        createNote({ title }).then(n => setActiveNote(n.id));
      }
    }
  }, [setActiveNote, createNote]);

  const handleAddTag = async (tagId?: string, newName?: string) => {
    if (!activeNoteId) return;
    let tid = tagId;
    if (!tid && newName?.trim()) {
      const tag = await createTag(newName.trim());
      tid = tag.id;
    }
    if (tid) {
      await addTagToNote(activeNoteId, tid);
      setNewTagName('');
      setShowTagPicker(false);
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    if (!activeNoteId) return;
    await removeTagFromNote(activeNoteId, tagId);
  };

  const handleSaveNow = () => {
    if (activeNoteId) {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      updateNote(activeNoteId, { contentMd: localContent, title: localTitle });
      setIsDirty(false);
    }
  };

  if (!note) {
    return (
      <div className="flex-1 flex items-center justify-center bg-bg text-center">
        <div className="max-w-sm space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-surface-hover flex items-center justify-center mx-auto">
            <span className="text-2xl">📝</span>
          </div>
          <h2 className="text-lg font-semibold text-fg">No note selected</h2>
          <p className="text-sm text-muted">Select a note from the list or create a new one.</p>
          <button
            onClick={() => createNote().then(n => setActiveNote(n.id))}
            className="btn-primary text-sm"
          >
            + New Note
          </button>
        </div>
      </div>
    );
  }

  const noteTags = tags.filter(t => note.tags.includes(t.id));
  const availableTags = tags.filter(t => !note.tags.includes(t.id));
  const filteredAvailable = newTagName
    ? availableTags.filter(t => t.name.toLowerCase().includes(newTagName.toLowerCase()))
    : availableTags;

  const cmExtensions = [
    markdown({ base: markdownLanguage, codeLanguages: languages }),
    EditorView.lineWrapping,
    keymap.of([...defaultKeymap, ...historyKeymap]),
  ];

  const currentMode: EditorMode = editorMode;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-bg">
      {/* Toolbar */}
      <EditorToolbar
        editorMode={currentMode}
        onModeChange={setEditorMode}
        onInsert={handleInsert}
      />

      {/* Title */}
      <div className="px-6 pt-4 pb-2 border-b border-border bg-bg flex-shrink-0">
        <div className="flex items-start gap-2">
          <input
            value={localTitle}
            onChange={e => handleTitleChange(e.target.value)}
            onBlur={handleTitleBlur}
            placeholder="Note title..."
            className="flex-1 text-2xl font-bold bg-transparent border-none outline-none text-fg placeholder-muted/40 leading-tight min-w-0"
          />
          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0 pt-1">
            {isDirty && (
              <button
                onClick={handleSaveNow}
                className="text-xs text-muted hover:text-fg px-2 py-1 rounded hover:bg-surface-hover transition-colors"
                title="Save now"
              >
                Save
              </button>
            )}
            <button
              onClick={() => pinNote(note.id, !note.isPinned)}
              title={note.isPinned ? 'Unpin' : 'Pin'}
              className={cn('p-1.5 rounded hover:bg-surface-hover transition-colors', note.isPinned ? 'text-amber-500' : 'text-muted hover:text-fg')}
            >
              {note.isPinned ? <Pin size={15} /> : <PinOff size={15} />}
            </button>
            <button
              onClick={() => favoriteNote(note.id, !note.isFavorite)}
              title={note.isFavorite ? 'Unfavorite' : 'Favorite'}
              className={cn('p-1.5 rounded hover:bg-surface-hover transition-colors', note.isFavorite ? 'text-amber-400' : 'text-muted hover:text-fg')}
            >
              {note.isFavorite ? <Star size={15} className="fill-amber-400" /> : <Star size={15} />}
            </button>
            <button
              onClick={() => { if (confirm('Move this note to trash?')) deleteNote(note.id); }}
              title="Delete"
              className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-muted hover:text-red-500 transition-colors"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        {/* Meta toggle + tags */}
        <div className="mt-2 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Tags */}
            {noteTags.map(tag => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-surface-hover rounded-full text-xs text-muted group"
              >
                <Hash size={10} />
                {tag.name}
                <button
                  onClick={() => handleRemoveTag(tag.id)}
                  className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity"
                >
                  <X size={10} />
                </button>
              </span>
            ))}
            {/* Add tag */}
            <div className="relative">
              <button
                onClick={() => setShowTagPicker(p => !p)}
                className="inline-flex items-center gap-1 px-2 py-0.5 border border-dashed border-border rounded-full text-xs text-muted hover:text-fg hover:border-accent transition-colors"
              >
                <Plus size={10} /> tag
              </button>
              {showTagPicker && (
                <div className="absolute top-full left-0 mt-1 z-20 bg-surface border border-border rounded-lg shadow-lg w-48 py-1">
                  <div className="px-2 py-1">
                    <input
                      autoFocus
                      value={newTagName}
                      onChange={e => setNewTagName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          const match = filteredAvailable[0];
                          if (match && !newTagName) handleAddTag(match.id);
                          else handleAddTag(undefined, newTagName);
                        }
                        if (e.key === 'Escape') setShowTagPicker(false);
                      }}
                      placeholder="Search or create..."
                      className="w-full bg-surface-hover border border-border rounded px-2 py-1 text-xs outline-none text-fg"
                    />
                  </div>
                  <div className="max-h-32 overflow-y-auto">
                    {filteredAvailable.map(t => (
                      <button
                        key={t.id}
                        onClick={() => handleAddTag(t.id)}
                        className="w-full px-3 py-1 text-xs text-left hover:bg-surface-hover text-fg flex items-center gap-1.5"
                      >
                        <Hash size={10} className="text-muted" /> {t.name}
                      </button>
                    ))}
                    {newTagName && !filteredAvailable.find(t => t.name.toLowerCase() === newTagName.toLowerCase()) && (
                      <button
                        onClick={() => handleAddTag(undefined, newTagName)}
                        className="w-full px-3 py-1 text-xs text-left hover:bg-surface-hover text-accent flex items-center gap-1.5"
                      >
                        <Plus size={10} /> Create "{newTagName}"
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Meta info */}
            <button
              onClick={() => setShowMeta(m => !m)}
              className="ml-auto flex items-center gap-1 text-xs text-muted hover:text-fg transition-colors"
            >
              <ChevronDown size={12} className={cn('transition-transform', showMeta ? 'rotate-180' : '')} />
              {showMeta ? 'Less' : 'More'}
            </button>
          </div>

          {showMeta && (
            <div className="flex items-center gap-4 text-xs text-muted">
              <span title={formatDateFull(note.createdAt)}>Created {new Date(note.createdAt).toLocaleDateString()}</span>
              <span title={formatDateFull(note.updatedAt)}>Updated {new Date(note.updatedAt).toLocaleDateString()}</span>
              {settings.showWordCount && (
                <span>{note.wordCount} words · {note.charCount} chars</span>
              )}
              {notebooks.find(n => n.id === note.notebookId) && (
                <span>📁 {notebooks.find(n => n.id === note.notebookId)?.name}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Editor + Preview */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor pane */}
        {(currentMode === 'edit' || currentMode === 'split') && (
          <div className={cn('flex flex-col overflow-hidden', currentMode === 'split' ? 'flex-1 border-r border-border' : 'flex-1')}>
            <CodeMirror
              value={localContent}
              onChange={handleContentChange}
              extensions={cmExtensions}
              theme={isDark ? githubDark : githubLight}
              style={{
                flex: 1,
                overflow: 'auto',
                fontSize: `${settings.fontSize}px`,
                fontFamily: settings.fontFamily === 'mono' ? 'JetBrains Mono, Fira Code, monospace' : settings.fontFamily === 'sans' ? 'system-ui, sans-serif' : 'Georgia, serif',
                lineHeight: settings.lineHeight,
              }}
              className="flex-1 overflow-auto"
              spellCheck={settings.spellcheck}
              basicSetup={{
                lineNumbers: settings.showLineNumbers,
                foldGutter: false,
                highlightActiveLine: true,
                highlightSelectionMatches: true,
                autocompletion: false,
              }}
            />
          </div>
        )}

        {/* Preview pane */}
        {(currentMode === 'preview' || currentMode === 'split') && (
          <div className={cn('flex-1 overflow-hidden', currentMode === 'split' ? '' : '')}>
            <MarkdownPreview
              content={localContent}
              onWikiLinkClick={handleWikiLinkClick}
              isDark={isDark}
            />
          </div>
        )}
      </div>

      {/* Bottom panel: backlinks + attachments */}
      {(backlinks.length > 0 || outlinks.length > 0) && (
        <BacklinksPanel noteId={note.id} />
      )}
    </div>
  );
}
