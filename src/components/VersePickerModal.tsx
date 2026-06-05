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

  // Build a robust book resolver: matches full name, official abbrev,
  // common aliases ("Psalm"/"Ps"/"Jn"/"Rom"/...), and is whitespace/
  // punctuation insensitive ("1cor", "1 Cor", "1Cor.", etc.).
  const bookResolver = useMemo(() => {
    const normalize = (s: string) =>
      s.toLowerCase().replace(/\./g, '').replace(/\s+/g, '').trim();

    const aliasGroups: Record<string, string[]> = {
      'Genesis': ['gen', 'ge', 'gn'],
      'Exodus': ['exo', 'ex'],
      'Leviticus': ['lev', 'lv'],
      'Numbers': ['num', 'nm', 'nu'],
      'Deuteronomy': ['deut', 'dt'],
      'Joshua': ['josh', 'jos', 'jsh'],
      'Judges': ['judg', 'jdg', 'jg'],
      'Ruth': ['rth', 'ru'],
      '1 Samuel': ['1sam', '1sa', '1sm', 'firstsamuel', 'firstsam'],
      '2 Samuel': ['2sam', '2sa', '2sm', 'secondsamuel', 'secondsam'],
      '1 Kings': ['1kgs', '1ki', '1kg', 'firstkings'],
      '2 Kings': ['2kgs', '2ki', '2kg', 'secondkings'],
      '1 Chronicles': ['1chr', '1ch', '1chron', 'firstchronicles'],
      '2 Chronicles': ['2chr', '2ch', '2chron', 'secondchronicles'],
      'Ezra': ['ezr'],
      'Nehemiah': ['neh', 'ne'],
      'Esther': ['esth', 'est', 'es'],
      'Job': ['jb'],
      'Psalms': ['ps', 'psa', 'psalm', 'pss', 'pslm', 'psm'],
      'Proverbs': ['prov', 'pr', 'pro', 'prv'],
      'Ecclesiastes': ['eccl', 'ecc', 'ec', 'qoh'],
      'Song of Solomon': ['song', 'sos', 'songofsongs', 'so', 'cant', 'canticles', 'songofsol'],
      'Isaiah': ['isa', 'is'],
      'Jeremiah': ['jer', 'je'],
      'Lamentations': ['lam', 'la'],
      'Ezekiel': ['ezek', 'eze', 'ezk'],
      'Daniel': ['dan', 'dn'],
      'Hosea': ['hos', 'ho'],
      'Joel': ['joe', 'jl'],
      'Amos': ['am'],
      'Obadiah': ['oba', 'ob'],
      'Jonah': ['jon', 'jnh'],
      'Micah': ['mic', 'mc'],
      'Nahum': ['nah', 'na'],
      'Habakkuk': ['hab', 'hb'],
      'Zephaniah': ['zeph', 'zep', 'zp'],
      'Haggai': ['hag', 'hg'],
      'Zechariah': ['zech', 'zec', 'zc'],
      'Malachi': ['mal', 'ml'],
      'Matthew': ['matt', 'mt', 'mat'],
      'Mark': ['mrk', 'mk', 'mr'],
      'Luke': ['lk', 'luk'],
      'John': ['jn', 'jhn', 'jo'],
      'Acts': ['ac', 'act'],
      'Romans': ['rom', 'ro', 'rm'],
      '1 Corinthians': ['1cor', '1co', '1corinth', 'firstcorinthians'],
      '2 Corinthians': ['2cor', '2co', '2corinth', 'secondcorinthians'],
      'Galatians': ['gal', 'ga'],
      'Ephesians': ['eph', 'ep'],
      'Philippians': ['phil', 'php', 'pp'],
      'Colossians': ['col', 'co'],
      '1 Thessalonians': ['1thess', '1th', '1thes', 'firstthessalonians'],
      '2 Thessalonians': ['2thess', '2th', '2thes', 'secondthessalonians'],
      '1 Timothy': ['1tim', '1ti', 'firsttimothy'],
      '2 Timothy': ['2tim', '2ti', 'secondtimothy'],
      'Titus': ['tit', 'ti'],
      'Philemon': ['phlm', 'phm', 'philem'],
      'Hebrews': ['heb'],
      'James': ['jas', 'jm'],
      '1 Peter': ['1pet', '1pe', '1pt', 'firstpeter'],
      '2 Peter': ['2pet', '2pe', '2pt', 'secondpeter'],
      '1 John': ['1jn', '1jo', '1jhn', 'firstjohn'],
      '2 John': ['2jn', '2jo', '2jhn', 'secondjohn'],
      '3 John': ['3jn', '3jo', '3jhn', 'thirdjohn'],
      'Jude': ['jud', 'jd'],
      'Revelation': ['rev', 'rv', 'revelations'],
    };

    const index = new Map<string, string>();
    for (const b of books) {
      index.set(normalize(b.name), b.name);
      index.set(normalize(b.abbrev), b.name);
      const aliases = aliasGroups[b.name] ?? [];
      for (const a of aliases) index.set(normalize(a), b.name);
    }
    return (raw: string) => index.get(normalize(raw)) ?? null;
  }, []);

  // Parse free-form reference like "John 3:16", "1 Cor 13:4-7", "Ps 23"
  function tryParseReference(s: string) {
    // Match: <book> <chapter>(:<verseStart>(-<verseEnd>)?)?
    const m = /^\s*([1-3]?\s*[A-Za-z][A-Za-z. ]*?)\s*\.?\s*(\d+)(?:\s*[:.\s]\s*(\d+)(?:\s*[-\u2013\u2014]\s*(\d+))?)?\s*$/.exec(s);
    if (!m) return null;
    const bookName = bookResolver(m[1]);
    if (!bookName) return null;
    return {
      book: bookName,
      chapter: parseInt(m[2], 10),
      verseStart: m[3] ? parseInt(m[3], 10) : 1,
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
