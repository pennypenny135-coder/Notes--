export function countWords(text: string): number {
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]+`/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 0).length;
}

export function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return 'yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: diffDay > 365 ? 'numeric' : undefined });
}

export function formatDateFull(ts: number): string {
  return new Date(ts).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function getDailyNoteTitle(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

export function truncate(str: string, len: number): string {
  return str.length > len ? str.slice(0, len) + '…' : str;
}

export function highlightText(text: string, query: string): string {
  if (!query) return text;
  try {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark>$1</mark>');
  } catch {
    return text;
  }
}

export function extractPreview(md: string, maxLen = 160): string {
  return md
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`[^`]+`/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*>\s+/gm, '')
    .replace(/\n+/g, ' ')
    .trim()
    .slice(0, maxLen);
}
