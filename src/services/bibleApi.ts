import type { Verse, Translation } from '../types';
import { books } from '../data/books';

const API_KEY = import.meta.env.VITE_ESV_API_KEY || '';
const ESV_BASE = 'https://api.esv.org/v3/passage/text/';

// Bible book name -> API.Bible book ID mapping for NASB
// Using api.scripture.api.bible for NASB1995
const SCRIPTURE_API_KEY = import.meta.env.VITE_SCRIPTURE_API_KEY || '';
const SCRIPTURE_BASE = 'https://api.scripture.api.bible/v1';
const NASB_BIBLE_ID = '592420522e16049f-01';

function getBookAbbrevForApi(bookName: string): string {
  const book = books.find((b) => b.name === bookName);
  return book?.abbrev || bookName;
}

async function fetchESV(bookName: string, chapter: number): Promise<Verse[]> {
  if (!API_KEY) {
    throw new Error('ESV API key not configured. Add VITE_ESV_API_KEY to your .env file.');
  }

  const query = `${bookName} ${chapter}`;
  const params = new URLSearchParams({
    q: query,
    'include-headings': 'false',
    'include-footnotes': 'false',
    'include-verse-numbers': 'true',
    'include-short-copyright': 'false',
    'include-passage-references': 'false',
    'indent-paragraphs': '0',
    'indent-poetry': 'false',
    'indent-declares': '0',
    'indent-psalm-doxology': '0',
  });

  const response = await fetch(`${ESV_BASE}?${params}`, {
    headers: { Authorization: `Token ${API_KEY}` },
  });

  if (!response.ok) {
    throw new Error(`ESV API error: ${response.status}`);
  }

  const data = await response.json();
  const passageText: string = data.passages?.[0] || '';

  return parseEsvPassage(passageText, bookName, chapter);
}

function parseEsvPassage(text: string, bookName: string, chapter: number): Verse[] {
  const verses: Verse[] = [];
  // ESV API returns text with [N] markers for verse numbers
  const parts = text.split(/\[(\d+)\]\s*/);

  for (let i = 1; i < parts.length; i += 2) {
    const verseNum = parseInt(parts[i], 10);
    const verseText = (parts[i + 1] || '').trim();
    if (verseText) {
      verses.push({
        book: bookName,
        chapter,
        verse: verseNum,
        text: verseText,
      });
    }
  }

  return verses;
}

async function fetchNASB(bookName: string, chapter: number): Promise<Verse[]> {
  if (!SCRIPTURE_API_KEY) {
    throw new Error(
      'Scripture API key not configured. Add VITE_SCRIPTURE_API_KEY to your .env file. Get a free key at https://scripture.api.bible'
    );
  }

  const abbrev = getBookAbbrevForApi(bookName);
  const chapterId = `${abbrev}.${chapter}`;

  const response = await fetch(
    `${SCRIPTURE_BASE}/bibles/${NASB_BIBLE_ID}/chapters/${chapterId}/verses`,
    {
      headers: { 'api-key': SCRIPTURE_API_KEY },
    }
  );

  if (!response.ok) {
    throw new Error(`Scripture API error: ${response.status}`);
  }

  const data = await response.json();
  const versesData = data.data || [];

  const verses: Verse[] = [];
  for (const v of versesData) {
    const verseResponse = await fetch(
      `${SCRIPTURE_BASE}/bibles/${NASB_BIBLE_ID}/verses/${v.id}?content-type=text&include-notes=false&include-titles=false`,
      { headers: { 'api-key': SCRIPTURE_API_KEY } }
    );
    if (verseResponse.ok) {
      const verseData = await verseResponse.json();
      const num = parseInt(v.id.split('.').pop() || '0', 10);
      verses.push({
        book: bookName,
        chapter,
        verse: num,
        text: (verseData.data?.content || '').trim(),
      });
    }
  }

  return verses;
}

const cache = new Map<string, Verse[]>();

export async function fetchChapter(
  bookName: string,
  chapter: number,
  translation: Translation
): Promise<Verse[]> {
  const cacheKey = `${translation}:${bookName}:${chapter}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)!;
  }

  let verses: Verse[];
  if (translation === 'ESV') {
    verses = await fetchESV(bookName, chapter);
  } else {
    verses = await fetchNASB(bookName, chapter);
  }

  cache.set(cacheKey, verses);
  return verses;
}

export async function fetchVerseRange(
  bookName: string,
  chapter: number,
  verseStart: number,
  verseEnd: number | null,
  translation: Translation
): Promise<Verse[]> {
  const allVerses = await fetchChapter(bookName, chapter, translation);
  const end = verseEnd ?? verseStart;
  return allVerses.filter((v) => v.verse >= verseStart && v.verse <= end);
}

export function getVerseText(verses: Verse[]): string {
  return verses.map((v) => v.text).join(' ');
}
