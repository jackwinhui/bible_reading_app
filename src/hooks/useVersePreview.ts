import { useEffect, useMemo, useState } from 'react';
import { fetchVerseRange } from '../services/bibleApi';
import type { Translation, Verse } from '../types';

export function useVersePreview(
  book: string,
  chapter: number,
  verseStart: number,
  verseEnd: number | null,
  translation: Translation
) {
  const request = useMemo(
    () => ({ book, chapter, verseStart, verseEnd, translation }),
    [book, chapter, verseStart, verseEnd, translation]
  );
  const [result, setResult] = useState<{
    request: typeof request;
    verses: Verse[];
    error: string | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const verses = await fetchVerseRange(
          request.book, request.chapter, request.verseStart, request.verseEnd, request.translation
        );
        if (!cancelled) setResult({ request, verses, error: null });
      } catch (error) {
        if (!cancelled) {
          setResult({
            request,
            verses: [],
            error: error instanceof Error ? error.message : 'Failed to load passage.',
          });
        }
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [request]);

  // A previous selection must not enable submission while the new one is debouncing.
  const current = result?.request === request ? result : null;
  return {
    verses: current?.verses ?? [],
    loading: !current,
    error: current?.error ?? null,
  };
}
