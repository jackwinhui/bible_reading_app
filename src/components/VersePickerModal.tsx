import { useEffect, useMemo, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { books } from '../data/books';
import { fetchChapter } from '../services/bibleApi';
import { useTranslation } from '../contexts/TranslationContext';
import type { Translation, VerseRef } from '../types';

interface VersePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (ref: VerseRef, snapshot: string) => void;
  initial?: { book?: string; chapter?: number; verse?: number };
}

export default function VersePickerModal({
  isOpen,
  onClose,
  onInsert,
  initial,
}: VersePickerModalProps) {
  const { translation: defaultTr } = useTranslation();

  const [translation, setTranslation] = useState<Translation>(defaultTr);
  const [book, setBook] = useState<string>(initial?.book || 'John');
  const [chapter, setChapter] = useState<number>(initial?.chapter || 1);
  const [verseStart, setVerseStart] = useState<number>(initial?.verse || 1);
  const [verseEnd, setVerseEnd] = useState<number | ''>('');
  const [reference, setReference] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const bookData = useMemo(() => books.find((b) => b.name === book), [book]);

  // Reset when opened
  useEffect(() => {
    if (!isOpen) return;
    setTranslation(defaultTr);
    setBook(initial?.book || 'John');
    setChapter(initial?.chapter || 1);
    setVerseStart(initial?.verse || 1);
    setVerseEnd('');
    setReference('');
    setPreview('');
    setError(null);
  }, [isOpen, initial, defaultTr]);

  // Parse free-form reference like "John 3:16" or "Romans 8:28-30"
  function tryParseReference(s: string) {
    const m = /^\s*(\d?\s?[A-Za-z ]+?)\s+(\d+):(\d+)(?:[-–](\d+))?\s*$/.exec(s);
    if (!m) return null;
    const bookName = m[1].trim();
    const match = books.find((b) => b.name.toLowerCase() === bookName.toLowerCase());
    if (!match) return null;
    return {
      book: match.name,
      chapter: parseInt(m[2], 10),
      verseStart: parseInt(m[3], 10),
      verseEnd: m[4] ? parseInt(m[4], 10) : undefined,
    };
  }

  const handleReferenceChange = (val: string) => {
    setReference(val);
    const parsed = tryParseReference(val);
    if (parsed) {
      setBook(parsed.book);
      setChapter(parsed.chapter);
      setVerseStart(parsed.verseStart);
      setVerseEnd(parsed.verseEnd ?? '');
    }
  };

  const loadPreview = async () => {
    setLoading(true);
    setError(null);
    setPreview('');
    try {
      const all = await fetchChapter(book, chapter, translation);
      const end = typeof verseEnd === 'number' ? verseEnd : verseStart;
      const slice = all.filter((v) => v.verse >= verseStart && v.verse <= end);
      if (slice.length === 0) {
        setError('No verses found for that reference.');
      } else {
        setPreview(slice.map((v) => `${v.verse}. ${v.text.replace(/\n+/g, ' ').trim()}`).join('\n'));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load passage.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-preview on field changes (debounced)
  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(loadPreview, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, book, chapter, verseStart, verseEnd, translation]);

  const handleInsert = async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await fetchChapter(book, chapter, translation);
      const end = typeof verseEnd === 'number' ? verseEnd : verseStart;
      const slice = all.filter((v) => v.verse >= verseStart && v.verse <= end);
      if (slice.length === 0) {
        setError('No verses found.');
        return;
      }
      const snapshot = slice.map((v) => v.text.replace(/\n+/g, ' ').trim()).join(' ');
      const ref: VerseRef = {
        book,
        chapter,
        verseStart,
        ...(typeof verseEnd === 'number' && verseEnd > verseStart ? { verseEnd } : {}),
        translation,
      };
      onInsert(ref, snapshot);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to insert.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-surface-900 rounded-2xl shadow-2xl border border-surface-200 dark:border-surface-700 w-full max-w-lg max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-surface-200 dark:border-surface-700">
          <h2 className="text-lg font-semibold">Insert Verse</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto">
          <div>
            <label className="block text-xs font-medium text-surface-500 mb-1">
              Quick reference (e.g., John 3:16-17)
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => handleReferenceChange(e.target.value)}
              placeholder="John 3:16"
              className="w-full px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-surface-50 dark:bg-surface-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-surface-500 mb-1">Book</label>
              <select
                value={book}
                onChange={(e) => {
                  setBook(e.target.value);
                  setChapter(1);
                  setVerseStart(1);
                  setVerseEnd('');
                }}
                className="w-full px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-surface-50 dark:bg-surface-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {books.map((b) => (
                  <option key={b.id} value={b.name}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-500 mb-1">Translation</label>
              <select
                value={translation}
                onChange={(e) => setTranslation(e.target.value as Translation)}
                className="w-full px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-surface-50 dark:bg-surface-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {(['ESV', 'NASB1995', 'CSB', 'NLT'] as Translation[]).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-medium text-surface-500 mb-1">Chapter</label>
              <input
                type="number"
                min={1}
                max={bookData?.chapters ?? 150}
                value={chapter}
                onChange={(e) => setChapter(Math.max(1, parseInt(e.target.value || '1', 10)))}
                className="w-full px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-surface-50 dark:bg-surface-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-500 mb-1">Verse start</label>
              <input
                type="number"
                min={1}
                value={verseStart}
                onChange={(e) => setVerseStart(Math.max(1, parseInt(e.target.value || '1', 10)))}
                className="w-full px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-surface-50 dark:bg-surface-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-500 mb-1">Verse end</label>
              <input
                type="number"
                min={verseStart}
                value={verseEnd}
                onChange={(e) =>
                  setVerseEnd(e.target.value === '' ? '' : parseInt(e.target.value, 10))
                }
                placeholder="(optional)"
                className="w-full px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-surface-50 dark:bg-surface-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-surface-500 mb-1">Preview</label>
            <div className="min-h-[80px] max-h-[200px] overflow-y-auto p-3 rounded-lg bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-sm whitespace-pre-line leading-relaxed">
              {loading ? (
                <div className="flex items-center gap-2 text-surface-500">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                </div>
              ) : error ? (
                <span className="text-red-500">{error}</span>
              ) : preview ? (
                preview
              ) : (
                <span className="text-surface-400">Type a reference or select book/chapter/verse.</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-surface-200 dark:border-surface-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800"
          >
            Cancel
          </button>
          <button
            onClick={handleInsert}
            disabled={loading || !preview}
            className="px-4 py-2 text-sm rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Insert
          </button>
        </div>
      </div>
    </div>
  );
}
