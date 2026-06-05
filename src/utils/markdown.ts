// Minimal, safe markdown-lite renderer for journal text blocks.
// Supports: # h1..### h3, **bold**, *italic*, `code`, > blockquote,
// - / * bullet lists, 1. ordered lists, blank-line paragraph breaks.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function inline(s: string): string {
  let out = escapeHtml(s);
  out = out.replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-surface-100 dark:bg-surface-800 text-[0.9em]">$1</code>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  return out;
}

export function renderMarkdown(src: string): string {
  if (!src.trim()) return '';
  const lines = src.split('\n');
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Headings
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      const sizes = ['text-xl font-bold', 'text-lg font-semibold', 'text-base font-semibold'];
      out.push(`<h${level} class="${sizes[level - 1]} mt-3 mb-2">${inline(h[2])}</h${level}>`);
      i++;
      continue;
    }

    // Blockquote
    if (/^>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      out.push(
        `<blockquote class="border-l-4 border-surface-300 dark:border-surface-600 pl-3 italic text-surface-600 dark:text-surface-400 my-2">${inline(
          buf.join(' ')
        )}</blockquote>`
      );
      continue;
    }

    // Unordered list
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(`<li>${inline(lines[i].replace(/^[-*]\s+/, ''))}</li>`);
        i++;
      }
      out.push(`<ul class="list-disc pl-6 my-2 space-y-0.5">${items.join('')}</ul>`);
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(`<li>${inline(lines[i].replace(/^\d+\.\s+/, ''))}</li>`);
        i++;
      }
      out.push(`<ol class="list-decimal pl-6 my-2 space-y-0.5">${items.join('')}</ol>`);
      continue;
    }

    // Blank line -> paragraph break
    if (!line.trim()) {
      i++;
      continue;
    }

    // Paragraph (consume until blank line)
    const buf: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^([#>\-*]|\d+\.)\s/.test(lines[i])) {
      buf.push(lines[i]);
      i++;
    }
    out.push(`<p class="my-2 leading-relaxed">${inline(buf.join(' '))}</p>`);
  }
  return out.join('');
}

export function formatVerseRef(ref: {
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd?: number;
}): string {
  const range = ref.verseEnd && ref.verseEnd > ref.verseStart
    ? `${ref.verseStart}-${ref.verseEnd}`
    : `${ref.verseStart}`;
  return `${ref.book} ${ref.chapter}:${range}`;
}

/**
 * Parse a YYYY-MM-DD string as a date in the local timezone.
 * Avoids the timezone shift you get with `new Date("2026-06-05")`,
 * which JS treats as UTC midnight and then displays in local time
 * (causing dates to render as the previous day in negative-UTC zones).
 */
export function parseLocalDate(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map((n) => parseInt(n, 10));
  if (!y || !m || !d) return new Date(ymd);
  return new Date(y, m - 1, d);
}
