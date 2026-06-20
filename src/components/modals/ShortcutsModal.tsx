import { X, Keyboard } from 'lucide-react';

interface Props {
  onClose: () => void;
}

const shortcuts = [
  { group: 'Navigation', items: [
    { keys: ['Ctrl', 'N'], desc: 'New note' },
    { keys: ['Ctrl', 'F'], desc: 'Focus search' },
    { keys: ['Ctrl', '\\'], desc: 'Toggle sidebar' },
    { keys: ['Ctrl', 'K'], desc: 'Command palette' },
  ]},
  { group: 'Editor', items: [
    { keys: ['Ctrl', 'S'], desc: 'Save note' },
    { keys: ['Ctrl', 'B'], desc: 'Bold' },
    { keys: ['Ctrl', 'I'], desc: 'Italic' },
    { keys: ['Ctrl', 'E'], desc: 'Toggle edit/preview' },
    { keys: ['Ctrl', '/'], desc: 'Toggle shortcuts' },
  ]},
  { group: 'Wiki Links', items: [
    { keys: ['[['], desc: 'Insert wiki link' },
    { keys: ['Click'], desc: 'Navigate to linked note' },
  ]},
  { group: 'Import / Export', items: [
    { keys: ['Ctrl', 'I'], desc: 'Import modal' },
    { keys: ['Ctrl', 'Shift', 'E'], desc: 'Export modal' },
  ]},
];

export function ShortcutsModal({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-surface rounded-xl border border-border shadow-2xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <h2 className="font-semibold text-fg flex items-center gap-2">
            <Keyboard size={16} className="text-accent" /> Keyboard Shortcuts
          </h2>
          <button onClick={onClose} className="text-muted hover:text-fg transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {shortcuts.map(group => (
            <div key={group.group}>
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">{group.group}</h3>
              <div className="space-y-1.5">
                {group.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm text-fg">{item.desc}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((key, j) => (
                        <span key={j} className="px-1.5 py-0.5 bg-surface-hover border border-border rounded text-xs font-mono text-fg">
                          {key}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
