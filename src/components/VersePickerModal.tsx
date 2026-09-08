import { useMemo, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { books } from '../data/books';
import { useTranslation } from '../contexts/TranslationContext';
import { useVersePreview } from '../hooks/useVersePreview';
import { parseReference } from '../utils/bookResolver';
import type { Translation, VerseRef } from '../types';

interface VersePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (ref: VerseRef, snapshot: string) => void;
  initial?: { book?: string; chapter?: number; verse?: number };
}

export default function VersePickerModal({
  isOpen,
  ...props
}: VersePickerModalProps) {
  const { translation: defaultTr } = useTranslation();
  if (!isOpen) return null;
  return (
    <VersePickerForm
      key={JSON.stringify([defaultTr, props.initial])}
      {...props}
      defaultTr={defaultTr}
    />
  );
}

function VersePickerForm({
  onClose,
  onInsert,
  initial,
  defaultTr,
}: Omit<VersePickerModalProps, 'isOpen'> & { defaultTr: Translation }) {
  const [translation, setTranslation] = useState<Translation>(defaultTr);
  const [book, setBook] = useState<string>(initial?.book || 'John');
  const [chapter, setChapter] = useState<number>(initial?.chapter || 1);
  const [verseStart, setVerseStart] = useState<number>(initial?.verse || 1);
  const [verseEnd, setVerseEnd] = useState<number | ''>('');
  const [reference, setReference] = useState<string>('');
  const { verses, loading, error } = useVersePreview(
    book, chapter, verseStart, typeof verseEnd === 'number' ? verseEnd : null, translation
  );
  const preview = verses
    .map((v) => `${v.verse}. ${v.text.replace(/\n+/g, ' ').trim()}`)
    .join('\n');

  const bookData = useMemo(() => books.find((b) => b.name === book), [book]);

  const handleReferenceChange = (val: string) => {
    setReference(val);
    const parsed = parseReference(val);
    if (parsed) {
      setBook(parsed.book);
      setChapter(parsed.chapter);
      setVerseStart(parsed.verseStart);
      setVerseEnd(parsed.verseEnd ?? '');
    }
  };

  const handleInsert = () => {
    const snapshot = verses.map((v) => v.text.replace(/\n+/g, ' ').trim()).join(' ');
    const ref: VerseRef = {
      book,
      chapter,
      verseStart,
      ...(typeof verseEnd === 'number' && verseEnd > verseStart ? { verseEnd } : {}),
      translation,
    };
    onInsert(ref, snapshot);
    onClose();
  };

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
              Quick reference
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => handleReferenceChange(e.target.value)}
              placeholder="e.g. John 3:16, 1 Cor 13:4-7, Ps 23, Rom 8"
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
