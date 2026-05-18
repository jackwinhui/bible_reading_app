import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { X, Pencil } from 'lucide-react';
import { useJournal } from '../contexts/JournalContext';
import { formatVerseRef } from '../utils/markdown';
import type { JournalEntry } from '../types';

interface JournalPopoverProps {
  book: string;
  chapter: number;
  verse: number;
  anchorRect: DOMRect | null;
  onClose: () => void;
}

export default function JournalPopover({
  book,
  chapter,
  verse,
  anchorRect,
  onClose,
}: JournalPopoverProps) {
  const { getEntriesForVerse } = useJournal();
  const entries = getEntriesForVerse(book, chapter, verse);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (popRef.current && !popRef.current.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  if (!anchorRect) return null;

  const top = anchorRect.bottom + 8;
  const left = Math.max(8, Math.min(anchorRect.left, window.innerWidth - 380));

  return (
    <div
      ref={popRef}
      className="fixed z-50 w-[360px] max-h-[60vh] overflow-y-auto bg-white dark:bg-surface-900 rounded-xl shadow-2xl border border-surface-200 dark:border-surface-700"
      style={{ top, left }}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50 rounded-t-xl">
        <div className="text-xs font-semibold text-surface-600 dark:text-surface-300">
          Reflections on {book} {chapter}:{verse}
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-surface-200 dark:hover:bg-surface-700"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-2 space-y-2">
        {entries.length === 0 ? (
          <p className="text-sm text-surface-400 p-3 text-center">No entries yet.</p>
        ) : (
          entries.map((e) => <EntryCard key={e.id} entry={e} book={book} chapter={chapter} verse={verse} />)
        )}
      </div>
    </div>
  );
}

function EntryCard({
  entry,
  book,
  chapter,
  verse,
}: {
  entry: JournalEntry;
  book: string;
  chapter: number;
  verse: number;
}) {
  // Build a short excerpt of the body around the matching verse block
  const refIdx = entry.body.findIndex(
    (b) =>
      b.type === 'verse' &&
      b.ref.book === book &&
      b.ref.chapter === chapter &&
      verse >= b.ref.verseStart &&
      verse <= (b.ref.verseEnd ?? b.ref.verseStart)
  );
  const surrounding = (() => {
    if (refIdx === -1) {
      const first = entry.body.find((b) => b.type === 'text') as { content: string } | undefined;
      return first?.content ?? '';
    }
    // Prefer the next text block after the verse, else the previous
    const next = entry.body[refIdx + 1];
    if (next && next.type === 'text' && next.content.trim()) return next.content;
    const prev = entry.body[refIdx - 1];
    if (prev && prev.type === 'text' && prev.content.trim()) return prev.content;
    return '';
  })();

  const excerpt = surrounding.slice(0, 220).trim();
  const otherRefs = entry.verseRefs.filter(
    (r) =>
      !(r.book === book && r.chapter === chapter && verse >= r.verseStart && verse <= (r.verseEnd ?? r.verseStart))
  );

  return (
    <div className="p-3 rounded-lg border border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold truncate">
            {entry.title || 'Untitled entry'}
          </div>
          <div className="text-[11px] text-surface-400">
            {new Date(entry.date).toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </div>
        </div>
        <Link
          to={`/journal/${entry.id}`}
          className="shrink-0 p-1 rounded text-surface-400 hover:text-primary-600 dark:hover:text-primary-400"
          title="Open entry"
        >
          <Pencil className="w-3.5 h-3.5" />
        </Link>
      </div>
      {excerpt && (
        <p className="text-xs text-surface-600 dark:text-surface-400 leading-relaxed line-clamp-3">
          {excerpt}
          {surrounding.length > 220 && '…'}
        </p>
      )}
      {otherRefs.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {otherRefs.slice(0, 4).map((r, i) => (
            <span
              key={i}
              className="text-[10px] px-1.5 py-0.5 rounded bg-surface-100 dark:bg-surface-800 text-surface-500"
            >
              {formatVerseRef(r)}
            </span>
          ))}
          {otherRefs.length > 4 && (
            <span className="text-[10px] text-surface-400">+{otherRefs.length - 4} more</span>
          )}
        </div>
      )}
    </div>
  );
}
