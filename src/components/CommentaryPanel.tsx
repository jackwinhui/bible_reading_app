import { useEffect, useRef, useState, useCallback } from 'react';
import { Loader2, AlertCircle, ExternalLink, BookOpen } from 'lucide-react';
import type { CommentaryChapter, CommentarySection } from '../types';
import {
  fetchCommentary,
  commentaryUrl,
  CommentaryUnavailableError,
} from '../services/commentaryApi';

interface CommentaryPanelProps {
  book: string;
  chapter: number;
  activeVerse: number | null;
}

const indentClass = ['', 'pl-5', 'pl-10'];

function sectionContainsVerse(section: CommentarySection, verse: number): boolean {
  return !!section.verses && verse >= section.verses[0] && verse <= section.verses[1];
}

export default function CommentaryPanel({ book, chapter, activeVerse }: CommentaryPanelProps) {
  const [data, setData] = useState<CommentaryChapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    setUnavailable(false);
    setData(null);
    sectionRefs.current.clear();

    try {
      const result = await fetchCommentary(book, chapter);
      if (id === requestId.current) setData(result);
    } catch (err) {
      if (id !== requestId.current) return;
      if (err instanceof CommentaryUnavailableError) {
        setUnavailable(true);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load commentary');
      }
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [book, chapter]);

  useEffect(() => {
    load();
  }, [load]);

  // Scroll the commentary to the section matching the active verse.
  useEffect(() => {
    if (activeVerse == null || !data) return;
    const matchIndex = data.sections.findIndex((s) => sectionContainsVerse(s, activeVerse));
    if (matchIndex < 0) return;
    const el = sectionRefs.current.get(matchIndex);
    const container = scrollRef.current;
    if (el && container) {
      const top = el.offsetTop - container.offsetTop - 8;
      container.scrollTo({ top, behavior: 'smooth' });
    }
  }, [activeVerse, data]);

  const url = commentaryUrl(book, chapter);

  return (
    <div className="flex flex-col h-full w-full border-l border-surface-200 dark:border-surface-700">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-surface-200 dark:border-surface-700 shrink-0">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400">
          <BookOpen className="w-3.5 h-3.5" />
          Enduring Word
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:underline"
          title="Open on enduringword.com"
        >
          Source <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Panel body */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 text-[15px] leading-relaxed">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-surface-500">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Loading commentary...
          </div>
        ) : unavailable ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-surface-500">
            <BookOpen className="w-7 h-7 mb-3 text-surface-400" />
            <p className="text-sm">Commentary is only available in the desktop app.</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <AlertCircle className="w-7 h-7 text-red-400 mb-3" />
            <p className="text-sm text-surface-600 dark:text-surface-400">{error}</p>
          </div>
        ) : !data || data.sections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-surface-500">
            <p className="text-sm">No commentary available for this chapter.</p>
          </div>
        ) : (
          <div>
            {data.grouped && data.groupChapters && (
              <div className="mb-4 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300">
                Enduring Word covers {book}{' '}
                {data.groupChapters[0]}–{data.groupChapters[data.groupChapters.length - 1]}{' '}
                on one combined page. Showing the portion for chapter {chapter}.
              </div>
            )}
            {data.sections.map((section, i) => {
              const isActive =
                activeVerse != null && sectionContainsVerse(section, activeVerse);
              return (
                <div
                  key={i}
                  ref={(el) => {
                    if (el) sectionRefs.current.set(i, el);
                  }}
                  className={`scroll-mt-2 ${section.level === 'section' ? 'mt-6 first:mt-0' : 'mt-4'}`}
                >
                  {section.heading && (
                    <div
                      className={`${
                        section.level === 'section'
                          ? 'text-base font-bold text-surface-900 dark:text-surface-50'
                          : 'text-sm font-semibold text-surface-800 dark:text-surface-200'
                      } ${isActive ? 'text-primary-700 dark:text-primary-300' : ''}`}
                    >
                      {section.verses && (
                        <span className="inline-block mr-1.5 px-1.5 py-0.5 rounded text-[11px] font-bold bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300 align-middle">
                          {section.verses[0]}
                          {section.verses[1] !== section.verses[0] ? `–${section.verses[1]}` : ''}
                        </span>
                      )}
                      {section.heading}
                    </div>
                  )}
                  {section.paragraphs.map((p, i) => (
                    <p
                      key={i}
                      className={`mt-1.5 text-surface-700 dark:text-surface-300 ${indentClass[p.indent] || ''}`}
                      dangerouslySetInnerHTML={{ __html: p.html }}
                    />
                  ))}
                </div>
              );
            })}

            <p className="mt-8 pt-4 border-t border-surface-200 dark:border-surface-700 text-xs text-surface-400">
              © Enduring Word Bible Commentary by David Guzik.{' '}
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 dark:text-primary-400 hover:underline"
              >
                Read on enduringword.com
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
