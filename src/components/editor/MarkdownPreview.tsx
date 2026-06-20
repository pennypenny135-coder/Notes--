import React, { useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useAppStore } from '../../store/useAppStore';

interface Props {
  content: string;
  onWikiLinkClick?: (title: string, noteId?: string) => void;
  isDark?: boolean;
}

export function MarkdownPreview({ content, onWikiLinkClick, isDark }: Props) {
  const { notes } = useAppStore();

  // Pre-process: replace [[wiki links]] with custom spans
  const processedContent = content.replace(/\[\[([^\]]+)\]\]/g, (_, title) => {
    const note = notes.find(n => n.title.toLowerCase() === title.trim().toLowerCase() && n.status !== 'trash');
    if (note) {
      return `<span class="wiki-link" data-note-id="${note.id}" data-title="${title.trim()}">${title.trim()}</span>`;
    }
    return `<span class="wiki-link wiki-link-missing" data-title="${title.trim()}">${title.trim()}</span>`;
  });

  const handleClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('wiki-link')) {
      e.preventDefault();
      const noteId = target.dataset.noteId;
      const title = target.dataset.title ?? '';
      onWikiLinkClick?.(title, noteId);
    }
  }, [onWikiLinkClick]);

  return (
    <div
      className="markdown-preview prose prose-sm dark:prose-invert max-w-none h-full overflow-y-auto px-6 py-4"
      onClick={handleClick}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[rehypeRaw]}
        components={{
          code({ node, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match && !className;
            if (isInline) {
              return (
                <code className="bg-surface-hover text-accent px-1 py-0.5 rounded text-[0.85em] font-mono" {...props}>
                  {children}
                </code>
              );
            }
            return (
              <SyntaxHighlighter
                style={isDark ? oneDark : oneLight}
                language={match ? match[1] : 'text'}
                PreTag="div"
                className="!rounded-lg !text-sm !my-3"
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            );
          },
          a({ href, children, ...props }) {
            return (
              <a
                href={href}
                target={href?.startsWith('http') ? '_blank' : undefined}
                rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="text-accent hover:underline"
                {...props}
              >
                {children}
              </a>
            );
          },
          blockquote({ children, ...props }) {
            return (
              <blockquote className="border-l-4 border-accent/40 pl-4 text-muted italic my-3" {...props}>
                {children}
              </blockquote>
            );
          },
          table({ children, ...props }) {
            return (
              <div className="overflow-x-auto my-3">
                <table className="min-w-full border-collapse text-sm" {...props}>{children}</table>
              </div>
            );
          },
          th({ children, ...props }) {
            return <th className="border border-border px-3 py-1.5 bg-surface-hover font-semibold text-left" {...props}>{children}</th>;
          },
          td({ children, ...props }) {
            return <td className="border border-border px-3 py-1.5" {...props}>{children}</td>;
          },
          input({ type, checked, ...props }) {
            if (type === 'checkbox') {
              return <input type="checkbox" checked={checked} readOnly className="mr-1.5 accent-accent" {...props} />;
            }
            return <input type={type} {...props} />;
          },
          img({ src, alt, ...props }) {
            return (
              <img
                src={src}
                alt={alt}
                className="max-w-full rounded-lg my-2 border border-border"
                loading="lazy"
                {...props}
              />
            );
          },
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}
