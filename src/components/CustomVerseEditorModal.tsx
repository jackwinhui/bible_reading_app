import { useEffect, useMemo, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { books } from '../data/books';
import { fetchVerseRange, getVerseText } from '../services/bibleApi';
import { useTranslation } from '../contexts/TranslationContext';
import { parseReference } from '../utils/bookResolver';
import type { CustomMemoryVerse, Translation } from '../types';

interface CustomVerseEditorModalProps {
  isOpen: boolean;
  initial?: CustomMemoryVerse;
  onClose: () => void;
  onSave: (verse: Omit<CustomMemoryVerse, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

export default function CustomVerseEditorModal({
  isOpen,
  initial,
  onClose,
  onSave,
}: CustomVerseEditorModalProps) {
  const { translation: defaultTr } = useTranslation();

  const [title, setTitle] = useState(initial?.title ?? '');
  const [reference, setReference] = useState(initial?.reference ?? '');
  const [translation, setTranslation] = useState<Translation>(initial?.translation ?? defaultTr);
  const [book, setBook] = useState<string>(initial?.book ?? 'John');
  const [chapter, setChapter] = useState<number>(initial?.chapter ?? 1);
  const [verseStart, setVerseStart] = useState<number>(initial?.verseStart ?? 1);
  const [verseEnd, setVerseEnd] = useState<number | ''>(initial?.verseEnd ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');

  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const bookData = useMemo(() => books.find((b) => b.name === book), [book]);

  // Reset / hydrate from initial when opened
  useEffect(() => {
    if (!isOpen) return;
    setTitle(initial?.title ?? '');
    setReference(initial?.reference ?? '');
    setTranslation(initial?.translation ?? defaultTr);
    setBook(initial?.book ?? 'John');
    setChapter(initial?.chapter ?? 1);
    setVerseStart(initial?.verseStart ?? 1);
    setVerseEnd(initial?.verseEnd ?? '');
    setDescription(initial?.description ?? '');
    setPreview('');
    setError(null);
  }, [isOpen, initial, defaultTr]);

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

  // Auto-preview (debounced)
  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const end = typeof verseEnd === 'number' ? verseEnd : null;
        const verses = await fetchVerseRange(book, chapter, verseStart, end, translation);
        if (verses.length === 0) {
          setError('No verses found for that reference.');
          setPreview('');
        } else {
          setPreview(getVerseText(verses));
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load passage.');
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [isOpen, book, chapter, verseStart, verseEnd, translation]);

  const handleSave = () => {
    if (!title.trim()) {
      setError('Please enter a title.');
      return;
    }
    if (!preview && !loading) {
      setError('Please select a valid verse reference.');
      return;
    }
    const end = typeof verseEnd === 'number' && verseEnd > verseStart ? verseEnd : null;
    const ref = end ? `${book} ${chapter}:${verseStart}-${end}` : `${book} ${chapter}:${verseStart}`;
    onSave({
      title: title.trim(),
      reference: ref,
      book,
      chapter,
      verseStart,
      verseEnd: end,
      translation,
      description: description.trim() || undefined,
    });
    onClose();
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
          <h2 className="text-lg font-semibold">
            {initial ? 'Edit memory verse' : 'Add memory verse'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto">
          <div>
            <label className="block text-xs font-medium text-surface-500 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Week 22 — Christ in You"
              className="w-full px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-surface-50 dark:bg-surface-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-surface-500 mb-1">
              Quick reference
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => handleReferenceChange(e.target.value)}
              placeholder="e.g. Colossians 1:27, Ps 23, 1 Cor 13:4-7"
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
            <div className="min-h-[60px] max-h-[150px] overflow-y-auto p-3 rounded-lg bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-sm leading-relaxed">
              {loading ? (
                <div className="flex items-center gap-2 text-surface-500">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                </div>
              ) : error ? (
                <span className="text-red-500">{error}</span>
              ) : preview ? (
                preview
              ) : (
                <span className="text-surface-400">Pick a verse to see a preview.</span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-surface-500 mb-1">
              Description / explanation <span className="text-surface-400">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Notes from your church, context for this verse, etc."
              rows={4}
              className="w-full px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-surface-50 dark:bg-surface-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y"
            />
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
            onClick={handleSave}
            disabled={loading || !title.trim() || (!preview && !loading)}
            className="px-4 py-2 text-sm rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {initial ? 'Save changes' : 'Add verse'}
          </button>
        </div>
      </div>
    </div>
  );
}
