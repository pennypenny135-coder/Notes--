
import { X, Settings, Sun, Moon, Monitor } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { cn } from '../../utils/cn';

interface Props {
  onClose: () => void;
}

export function SettingsModal({ onClose }: Props) {
  const { settings, updateSettings } = useAppStore();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-surface rounded-xl border border-border shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <h2 className="font-semibold text-fg flex items-center gap-2">
            <Settings size={16} className="text-accent" /> Settings
          </h2>
          <button onClick={onClose} className="text-muted hover:text-fg transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Appearance */}
          <section>
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Appearance</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-fg mb-2 block">Theme</label>
                <div className="flex gap-2">
                  {([['light', 'Light', Sun], ['dark', 'Dark', Moon], ['system', 'System', Monitor]] as const).map(([val, label, Icon]) => (
                    <button
                      key={val}
                      onClick={() => updateSettings({ theme: val })}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-sm transition-colors',
                        settings.theme === val
                          ? 'border-accent bg-accent/5 text-accent'
                          : 'border-border text-muted hover:border-accent/40 hover:text-fg'
                      )}
                    >
                      <Icon size={14} /> {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Editor */}
          <section>
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Editor</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-fg mb-2 block">Font size: {settings.fontSize}px</label>
                <input
                  type="range"
                  min={11}
                  max={20}
                  value={settings.fontSize}
                  onChange={e => updateSettings({ fontSize: Number(e.target.value) })}
                  className="w-full accent-accent"
                />
              </div>

              <div>
                <label className="text-sm text-fg mb-2 block">Font family</label>
                <div className="flex gap-2">
                  {(['mono', 'sans', 'serif'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => updateSettings({ fontFamily: f })}
                      className={cn(
                        'flex-1 py-1.5 rounded border text-sm transition-colors capitalize',
                        settings.fontFamily === f
                          ? 'border-accent bg-accent/5 text-accent'
                          : 'border-border text-muted hover:border-accent/40'
                      )}
                      style={{
                        fontFamily: f === 'mono' ? 'monospace' : f === 'sans' ? 'system-ui' : 'Georgia'
                      }}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm text-fg mb-2 block">Line height: {settings.lineHeight}</label>
                <input
                  type="range"
                  min={1.2}
                  max={2.2}
                  step={0.1}
                  value={settings.lineHeight}
                  onChange={e => updateSettings({ lineHeight: Number(e.target.value) })}
                  className="w-full accent-accent"
                />
              </div>

              <div>
                <label className="text-sm text-fg mb-2 block">Autosave delay: {settings.autosaveInterval}ms</label>
                <input
                  type="range"
                  min={500}
                  max={5000}
                  step={500}
                  value={settings.autosaveInterval}
                  onChange={e => updateSettings({ autosaveInterval: Number(e.target.value) })}
                  className="w-full accent-accent"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.showLineNumbers}
                    onChange={e => updateSettings({ showLineNumbers: e.target.checked })}
                    className="accent-accent"
                  />
                  <span className="text-sm text-fg">Show line numbers</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.showWordCount}
                    onChange={e => updateSettings({ showWordCount: e.target.checked })}
                    className="accent-accent"
                  />
                  <span className="text-sm text-fg">Show word count</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.spellcheck}
                    onChange={e => updateSettings({ spellcheck: e.target.checked })}
                    className="accent-accent"
                  />
                  <span className="text-sm text-fg">Spellcheck</span>
                </label>
              </div>
            </div>
          </section>

          {/* Layout */}
          <section>
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Layout</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-fg mb-1 block">Sidebar width: {settings.sidebarWidth}px</label>
                <input
                  type="range"
                  min={160}
                  max={320}
                  value={settings.sidebarWidth}
                  onChange={e => updateSettings({ sidebarWidth: Number(e.target.value) })}
                  className="w-full accent-accent"
                />
              </div>
              <div>
                <label className="text-sm text-fg mb-1 block">Note list width: {settings.listWidth}px</label>
                <input
                  type="range"
                  min={200}
                  max={400}
                  value={settings.listWidth}
                  onChange={e => updateSettings({ listWidth: Number(e.target.value) })}
                  className="w-full accent-accent"
                />
              </div>
            </div>
          </section>

          {/* About */}
          <section className="pb-2">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">About</h3>
            <div className="bg-surface-hover rounded-lg p-4 space-y-1 text-sm text-muted">
              <p className="font-medium text-fg">NoteVault</p>
              <p>Local-first knowledge management</p>
              <p>Version 1.0.0</p>
              <p className="text-xs mt-2">All data is stored locally in your browser's IndexedDB. No servers. No accounts. No tracking.</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
