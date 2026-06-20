import React from 'react';
import {
  Bold, Italic, Code, Link, List, ListOrdered, CheckSquare,
  Quote, Minus, Table, Image, Hash, Eye, Edit3, Columns
} from 'lucide-react';
import { cn } from '../../utils/cn';
import type { EditorMode } from '../../types';

interface Props {
  editorMode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
  onInsert: (text: string, offset?: number) => void;
}

interface ToolbarButton {
  icon: React.ReactNode;
  label: string;
  action: () => void;
}

export function EditorToolbar({ editorMode, onModeChange, onInsert }: Props) {
  const insert = (prefix: string, suffix = '', placeholder = '') => {
    onInsert(prefix + placeholder + suffix, prefix.length);
  };

  const buttons: ToolbarButton[] = [
    { icon: <Bold size={14} />, label: 'Bold (Ctrl+B)', action: () => insert('**', '**', 'bold') },
    { icon: <Italic size={14} />, label: 'Italic (Ctrl+I)', action: () => insert('_', '_', 'italic') },
    { icon: <Code size={14} />, label: 'Inline code', action: () => insert('`', '`', 'code') },
    { icon: <Link size={14} />, label: 'Link', action: () => insert('[', '](url)', 'text') },
    { icon: <Image size={14} />, label: 'Image', action: () => insert('![', '](url)', 'alt') },
    { icon: <List size={14} />, label: 'Bullet list', action: () => onInsert('\n- ', 0) },
    { icon: <ListOrdered size={14} />, label: 'Ordered list', action: () => onInsert('\n1. ', 0) },
    { icon: <CheckSquare size={14} />, label: 'Task list', action: () => onInsert('\n- [ ] ', 0) },
    { icon: <Quote size={14} />, label: 'Blockquote', action: () => onInsert('\n> ', 0) },
    { icon: <Minus size={14} />, label: 'Horizontal rule', action: () => onInsert('\n---\n', 0) },
    { icon: <Table size={14} />, label: 'Table', action: () => onInsert('\n| Col 1 | Col 2 |\n|-------|-------|\n| Cell  | Cell  |\n', 0) },
    { icon: <Hash size={14} />, label: 'Heading', action: () => onInsert('\n## ', 0) },
  ];

  return (
    <div className="flex items-center gap-0.5 px-2 py-1 border-b border-border bg-surface flex-shrink-0 overflow-x-auto">
      {/* Format buttons */}
      <div className="flex items-center gap-0.5 flex-shrink-0">
        {buttons.map((btn, i) => (
          <React.Fragment key={i}>
            {(i === 4 || i === 5 || i === 8 || i === 10) && (
              <div className="w-px h-4 bg-border mx-0.5 flex-shrink-0" />
            )}
            <button
              onClick={btn.action}
              title={btn.label}
              className="p-1.5 rounded text-muted hover:text-fg hover:bg-surface-hover transition-colors flex-shrink-0"
            >
              {btn.icon}
            </button>
          </React.Fragment>
        ))}
      </div>

      <div className="flex-1" />

      {/* View mode toggle */}
      <div className="flex items-center bg-surface-hover rounded-md p-0.5 gap-0.5 flex-shrink-0">
        <button
          onClick={() => onModeChange('edit')}
          title="Edit only"
          className={cn(
            'flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors',
            editorMode === 'edit' ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg'
          )}
        >
          <Edit3 size={12} /> Edit
        </button>
        <button
          onClick={() => onModeChange('split')}
          title="Split view"
          className={cn(
            'flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors',
            editorMode === 'split' ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg'
          )}
        >
          <Columns size={12} /> Split
        </button>
        <button
          onClick={() => onModeChange('preview')}
          title="Preview only"
          className={cn(
            'flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors',
            editorMode === 'preview' ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg'
          )}
        >
          <Eye size={12} /> Preview
        </button>
      </div>
    </div>
  );
}
