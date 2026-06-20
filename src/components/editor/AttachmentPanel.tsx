import { useRef } from 'react';
import { Paperclip, X, FileText, Download, Plus } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

interface Props {
  noteId: string;
}

export function AttachmentPanel({ noteId }: Props) {
  const { attachments, addAttachment, removeAttachment } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | File[]) => {
    for (const file of Array.from(files)) {
      if (file.size > 20 * 1024 * 1024) {
        alert(`File ${file.name} exceeds 20MB limit`);
        continue;
      }
      await addAttachment(noteId, file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  };

  const handleDownload = (att: typeof attachments[0]) => {
    const a = document.createElement('a');
    a.href = att.data;
    a.download = att.filename;
    a.click();
  };



  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  };

  if (attachments.length === 0) {
    return (
      <div
        className="border-t border-border px-4 py-2 bg-surface flex-shrink-0"
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
      >
        <div className="flex items-center gap-2 text-xs text-muted">
          <Paperclip size={12} />
          <span>No attachments</span>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="ml-auto flex items-center gap-1 hover:text-fg transition-colors"
          >
            <Plus size={12} /> Add
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={e => e.target.files && handleFiles(e.target.files)}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className="border-t border-border bg-surface flex-shrink-0"
      onDrop={handleDrop}
      onDragOver={e => e.preventDefault()}
    >
      <div className="px-4 py-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-muted uppercase tracking-wider flex items-center gap-1.5">
            <Paperclip size={11} /> {attachments.length} Attachment{attachments.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-xs text-muted hover:text-fg flex items-center gap-1 transition-colors"
          >
            <Plus size={11} /> Add
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={e => e.target.files && handleFiles(e.target.files)}
          />
        </div>
        <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto">
          {attachments.map(att => {
            const isImage = att.mimeType.startsWith('image/');
            return (
              <div
                key={att.id}
                className="group relative flex flex-col items-center bg-surface-hover rounded-lg overflow-hidden border border-border w-20 flex-shrink-0"
              >
                {isImage ? (
                  <img
                    src={att.data}
                    alt={att.filename}
                    className="w-20 h-14 object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-20 h-14 flex flex-col items-center justify-center bg-surface-hover text-muted">
                    <FileText size={20} />
                    <span className="text-[9px] mt-1 text-center px-1 leading-tight truncate w-full text-center">
                      {att.filename.split('.').pop()?.toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="w-full px-1 py-0.5">
                  <p className="text-[9px] text-muted truncate text-center">{att.filename}</p>
                  <p className="text-[9px] text-muted/50 text-center">{formatSize(att.size)}</p>
                </div>
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                  <button
                    onClick={() => handleDownload(att)}
                    className="p-1 rounded bg-white/10 hover:bg-white/20 text-white"
                    title="Download"
                  >
                    <Download size={11} />
                  </button>
                  <button
                    onClick={() => removeAttachment(att.id)}
                    className="p-1 rounded bg-red-500/80 hover:bg-red-500 text-white"
                    title="Delete"
                  >
                    <X size={11} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
