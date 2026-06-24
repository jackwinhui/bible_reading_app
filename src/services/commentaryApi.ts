import type { CommentaryChapter, CommentarySection } from '../types';

// Bridge exposed by electron/preload.cjs (only present in the Electron runtime).
interface CommentaryBridge {
  fetch: (
    book: string,
    chapter: number
  ) => Promise<{ ok: true; data: CommentaryChapter } | { ok: false; error: string }>;
}

declare global {
  interface Window {
    commentary?: CommentaryBridge;
  }
}

const SOURCE_NAME = 'Enduring Word';

function buildUrl(book: string, chapter: number): string {
  const overrides: Record<string, string> = {
    Psalms: 'psalm',
    'Song of Solomon': 'song-of-solomon',
  };
  const slug = overrides[book] || book.toLowerCase().replace(/\s+/g, '-');
  return `https://enduringword.com/bible-commentary/${slug}-${chapter}/`;
}

// --- Bundled commentary (personal build only) ---

type BundledChapter = {
  url?: string;
  sections: CommentarySection[];
  grouped?: boolean;
  groupChapters?: number[];
};
type BundledBook = Record<string, BundledChapter>;
let bundledData: Record<string, BundledBook> | null = null;
let bundledLoaded = false;

async function loadBundled(): Promise<Record<string, BundledBook> | null> {
  if (import.meta.env.VITE_PUBLIC_BUILD === '1') return null;
  if (bundledLoaded) return bundledData;
  try {
    const mod = await import('../data/commentary-enduring-word.json').catch(() => null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bundledData = mod ? ((mod as any).default || mod) : null;
  } catch {
    bundledData = null;
  }
  bundledLoaded = true;
  return bundledData;
}

function getBundledChapter(
  data: Record<string, BundledBook>,
  book: string,
  chapter: number
): CommentaryChapter | null {
  const chap = data[book]?.[String(chapter)];
  if (!chap) return null;
  return {
    book,
    chapter,
    source: SOURCE_NAME,
    url: chap.url || buildUrl(book, chapter),
    sections: chap.sections,
    ...(chap.grouped ? { grouped: true, groupChapters: chap.groupChapters } : {}),
  };
}

// --- Public API ---

const cache = new Map<string, CommentaryChapter>();

export class CommentaryUnavailableError extends Error {}

export async function fetchCommentary(
  book: string,
  chapter: number
): Promise<CommentaryChapter> {
  const key = `${book}:${chapter}`;
  const cached = cache.get(key);
  if (cached) return cached;

  // Personal build: use bundled commentary when present.
  const bundled = await loadBundled();
  if (bundled) {
    const result = getBundledChapter(bundled, book, chapter);
    if (result) {
      cache.set(key, result);
      return result;
    }
  }

  // Public build (or bundled miss): live fetch via the Electron main process.
  if (window.commentary) {
    const res = await window.commentary.fetch(book, chapter);
    if (!res.ok) {
      throw new Error(res.error || 'Failed to load commentary');
    }
    cache.set(key, res.data);
    return res.data;
  }

  throw new CommentaryUnavailableError(
    'Commentary is only available in the desktop app.'
  );
}

export function commentaryUrl(book: string, chapter: number): string {
  return buildUrl(book, chapter);
}
