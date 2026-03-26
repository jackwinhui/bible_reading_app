import { useParams, useNavigate, Link } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { books } from '../data/books';
import { fetchChapter } from '../services/bibleApi';
import { useTranslation } from '../contexts/TranslationContext';
import { useBookmarks } from '../contexts/BookmarkContext';
import { useAnnotations } from '../contexts/AnnotationContext';
import type { Verse } from '../types';
import VerseActionMenu from '../components/VerseActionMenu';

export default function ReadingPage() {
  const { bookName, chapter } = useParams();
  const navigate = useNavigate();
  const { translation } = useTranslation();
  const { isBookmarked } = useBookmarks();
  const { hasAnnotation, getAnnotation } = useAnnotations();

  const decodedName = decodeURIComponent(bookName || '');
  const chapterNum = parseInt(chapter || '1', 10);
  const book = books.find((b) => b.name === decodedName);

  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedVerse, setSelectedVerse] = useState<{
    verse: number;
    text: string;
    rect: DOMRect;
  } | null>(null);

  const loadChapter = useCallback(async () => {
    if (!book) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchChapter(decodedName, chapterNum, translation);
      setVerses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chapter');
    } finally {
      setLoading(false);
    }
  }, [decodedName, chapterNum, translation, book]);

  useEffect(() => {
    loadChapter();
    setSelectedVerse(null);
  }, [loadChapter]);

  if (!book) {
    return (
      <div className="p-6 text-center">
        <p className="text-surface-500">Book not found</p>
        <Link to="/" className="text-primary-600 hover:underline mt-2 inline-block">
          ← Back to books
        </Link>
      </div>
    );
  }

  const hasPrev = chapterNum > 1;
  const hasNext = chapterNum < book.chapters;

  const handleVerseClick = (verse: Verse, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (selectedVerse?.verse === verse.verse) {
      setSelectedVerse(null);
    } else {
      setSelectedVerse({ verse: verse.verse, text: verse.text, rect });
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Navigation header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate(`/read/${encodeURIComponent(book.name)}`)}
          className="flex items-center gap-1 text-sm text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {book.name}
        </button>

        <div className="flex items-center gap-2">
          {hasPrev && (
            <button
              onClick={() => navigate(`/read/${encodeURIComponent(book.name)}/${chapterNum - 1}`)}
              className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <span className="text-sm font-medium text-surface-600 dark:text-surface-400">
            Chapter {chapterNum} of {book.chapters}
          </span>
          {hasNext && (
            <button
              onClick={() => navigate(`/read/${encodeURIComponent(book.name)}/${chapterNum + 1}`)}
              className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Chapter title */}
      <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50 mb-1">
        {book.name} {chapterNum}
      </h1>
      <p className="text-xs text-surface-400 dark:text-surface-500 mb-6 uppercase tracking-wider">
        {translation}
      </p>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
          <span className="ml-2 text-surface-500">Loading chapter...</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mb-3" />
          <p className="text-surface-600 dark:text-surface-400 mb-2">{error}</p>
          <button
            onClick={loadChapter}
            className="text-sm text-primary-600 hover:text-primary-700 underline"
          >
            Try again
          </button>
        </div>
      ) : (
        <div className="leading-relaxed text-[17px]">
          {verses.map((verse) => {
            const bookmarked = isBookmarked(decodedName, chapterNum, verse.verse);
            const annotated = hasAnnotation(decodedName, chapterNum, verse.verse);
            const annotation = annotated ? getAnnotation(decodedName, chapterNum, verse.verse) : null;
            const isPoetry = verse.text.includes('\n');

            return (
              <span key={verse.verse}>
                {/* Section heading */}
                {verse.heading && (
                  <span className="block mt-8 mb-3">
                    {verse.heading.split('\n').map((h, i) => (
                      <span
                        key={i}
                        className={`block ${
                          i === 0
                            ? 'text-lg font-semibold text-surface-800 dark:text-surface-200'
                            : 'text-sm italic text-surface-500 dark:text-surface-400 mt-1'
                        }`}
                      >
                        {h}
                      </span>
                    ))}
                  </span>
                )}

                {/* Stanza break (extra vertical space between verse groups) */}
                {verse.stanzaBreak && !verse.heading && (
                  <span className="block mt-5" />
                )}

                {/* Paragraph break (for prose) */}
                {verse.paragraphBreak && !verse.heading && !verse.stanzaBreak && (
                  <span className="block mt-4" />
                )}

                <span
                  onClick={(e) => handleVerseClick(verse, e)}
                  className={`${isPoetry ? 'block mt-1' : 'inline'} cursor-pointer rounded px-0.5 transition-colors hover:bg-primary-50 dark:hover:bg-primary-950 ${
                    bookmarked ? 'bg-primary-50 dark:bg-primary-950 border-l-2 border-primary-400 pl-1' : ''
                  } ${annotated ? 'underline decoration-amber-400 decoration-2 underline-offset-4' : ''} ${
                    selectedVerse?.verse === verse.verse ? 'verse-highlight' : ''
                  }`}
                >
                  {isPoetry ? (
                    verse.text.split('\n').filter((l) => l.trim()).map((line, i) => {
                      const stripped = line.replace(/^\s+/, '');
                      const leadingSpaces = line.length - stripped.length;
                      const indent = leadingSpaces >= 8 ? 'pl-8' : leadingSpaces >= 4 ? 'pl-4' : '';
                      return (
                        <span key={i} className={i === 0 ? '' : `block ${indent}`}>
                          {i === 0 && (
                            <sup className="text-xs font-semibold text-primary-400 dark:text-primary-500 mr-0.5 select-none">
                              {verse.verse}
                            </sup>
                          )}
                          {stripped}
                        </span>
                      );
                    })
                  ) : (
                    <>
                      <sup className="text-xs font-semibold text-primary-400 dark:text-primary-500 mr-0.5 select-none">
                        {verse.verse}
                      </sup>
                      {verse.text}
                    </>
                  )}{' '}
                  {annotation && (
                    <span className="inline-block relative group">
                      <span className="text-amber-500 text-xs cursor-help">📝</span>
                      <span className="absolute bottom-full left-0 mb-1 w-48 p-2 bg-surface-800 dark:bg-surface-700 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-40 shadow-lg">
                        {annotation.note}
                      </span>
                    </span>
                  )}
                </span>
              </span>
            );
          })}
        </div>
      )}

      {/* Verse action menu */}
      {selectedVerse && (
        <VerseActionMenu
          book={decodedName}
          chapter={chapterNum}
          verse={selectedVerse.verse}
          verseText={selectedVerse.text}
          isOpen={true}
          onClose={() => setSelectedVerse(null)}
          anchorRect={selectedVerse.rect}
        />
      )}

      {/* Bottom navigation */}
      {!loading && !error && (
        <div className="flex justify-between mt-12 pt-6 border-t border-surface-200 dark:border-surface-700">
          {hasPrev ? (
            <Link
              to={`/read/${encodeURIComponent(book.name)}/${chapterNum - 1}`}
              className="flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400 hover:underline no-underline"
            >
              <ArrowLeft className="w-4 h-4" />
              Chapter {chapterNum - 1}
            </Link>
          ) : (
            <span />
          )}
          {hasNext ? (
            <Link
              to={`/read/${encodeURIComponent(book.name)}/${chapterNum + 1}`}
              className="flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400 hover:underline no-underline"
            >
              Chapter {chapterNum + 1}
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </div>
  );
}
