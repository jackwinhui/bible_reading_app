import type { Verse, Translation } from '../types';

const ESV_BASE = 'https://api.esv.org/v3/passage/text/';
const SCRIPTURE_BASE = 'https://rest.api.bible/v1';

function getApiKeys(): { esvApiKey: string; scriptureApiKey: string } {
  try {
    const stored = localStorage.getItem('bible-app-api-keys');
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        esvApiKey: parsed.esvApiKey || import.meta.env.VITE_ESV_API_KEY || '',
        scriptureApiKey: parsed.scriptureApiKey || import.meta.env.VITE_SCRIPTURE_API_KEY || '',
      };
    }
  } catch { /* ignore */ }
  return {
    esvApiKey: import.meta.env.VITE_ESV_API_KEY || '',
    scriptureApiKey: import.meta.env.VITE_SCRIPTURE_API_KEY || '',
  };
}

// Bible IDs on api.bible — update these if needed
const BIBLE_IDS: Record<string, string> = {
  NASB1995: 'b8ee27bcd1cae43a-01',
  CSB: 'a556c5305ee15c3f-01',
  NLT: 'd6e14a625393b4da-01',
};

// USFM book IDs used by API.Bible (keyed by our book name)
const USFM_BOOK_IDS: Record<string, string> = {
  'Genesis': 'GEN', 'Exodus': 'EXO', 'Leviticus': 'LEV', 'Numbers': 'NUM',
  'Deuteronomy': 'DEU', 'Joshua': 'JOS', 'Judges': 'JDG', 'Ruth': 'RUT',
  '1 Samuel': '1SA', '2 Samuel': '2SA', '1 Kings': '1KI', '2 Kings': '2KI',
  '1 Chronicles': '1CH', '2 Chronicles': '2CH', 'Ezra': 'EZR', 'Nehemiah': 'NEH',
  'Esther': 'EST', 'Job': 'JOB', 'Psalms': 'PSA', 'Proverbs': 'PRO',
  'Ecclesiastes': 'ECC', 'Song of Solomon': 'SNG', 'Isaiah': 'ISA', 'Jeremiah': 'JER',
  'Lamentations': 'LAM', 'Ezekiel': 'EZK', 'Daniel': 'DAN', 'Hosea': 'HOS',
  'Joel': 'JOL', 'Amos': 'AMO', 'Obadiah': 'OBA', 'Jonah': 'JON',
  'Micah': 'MIC', 'Nahum': 'NAM', 'Habakkuk': 'HAB', 'Zephaniah': 'ZEP',
  'Haggai': 'HAG', 'Zechariah': 'ZEC', 'Malachi': 'MAL',
  'Matthew': 'MAT', 'Mark': 'MRK', 'Luke': 'LUK', 'John': 'JHN',
  'Acts': 'ACT', 'Romans': 'ROM', '1 Corinthians': '1CO', '2 Corinthians': '2CO',
  'Galatians': 'GAL', 'Ephesians': 'EPH', 'Philippians': 'PHP', 'Colossians': 'COL',
  '1 Thessalonians': '1TH', '2 Thessalonians': '2TH', '1 Timothy': '1TI', '2 Timothy': '2TI',
  'Titus': 'TIT', 'Philemon': 'PHM', 'Hebrews': 'HEB', 'James': 'JAS',
  '1 Peter': '1PE', '2 Peter': '2PE', '1 John': '1JN', '2 John': '2JN',
  '3 John': '3JN', 'Jude': 'JUD', 'Revelation': 'REV',
};

// --- ESV API ---

async function fetchESV(bookName: string, chapter: number): Promise<Verse[]> {
  const { esvApiKey } = getApiKeys();
  if (!esvApiKey) {
    throw new Error('ESV API key not configured. Go to Settings to add your key.');
  }

  const query = `${bookName} ${chapter}`;
  const params = new URLSearchParams({
    q: query,
    'include-headings': 'true',
    'include-footnotes': 'false',
    'include-verse-numbers': 'true',
    'include-short-copyright': 'false',
    'include-passage-references': 'false',
    'indent-paragraphs': '2',
    'indent-poetry': 'true',
    'indent-declares': '0',
    'indent-psalm-doxology': '0',
  });

  const response = await fetch(`${ESV_BASE}?${params}`, {
    headers: { Authorization: `Token ${esvApiKey}` },
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

  // Split on verse markers [N] — keep the number as a capture group
  const parts = text.split(/\[(\d+)\]/);

  // Extract headings from preamble (before first verse)
  let pendingHeadings: string[] = [];
  let pendingParagraphBreak = false;

  if (parts[0]) {
    const preamble = parts[0].trim();
    if (preamble) {
      pendingHeadings = preamble
        .split(/\n\n+/)
        .map((h) => h.trim())
        .filter((h) => h.length > 0);
    }
  }

  for (let i = 1; i < parts.length; i += 2) {
    const verseNum = parseInt(parts[i], 10);
    let rawText = parts[i + 1] || '';

    // Detect stanza break: text ending with multiple blank lines
    const stanzaBreak = /\n\s*\n\s*\n/.test(rawText);

    // Detect paragraph break at end (prose: \n\n before next verse)
    const endsWithParagraphBreak = /\n\n\s*$/.test(rawText);

    // Check for a heading embedded at the end of this verse's text
    const headingAtEndMatch = rawText.match(/\n\n+((?:[A-Z][^\n]*\n?)+)\s*$/);
    if (headingAtEndMatch) {
      const headingBlock = headingAtEndMatch[1].trim();
      const headings = headingBlock
        .split(/\n\n+/)
        .map((h) => h.trim())
        .filter((h) => h.length > 0);
      rawText = rawText.slice(0, headingAtEndMatch.index);
      pendingHeadings = headings;
    }

    // Clean up the verse text while preserving poetry line structure
    const lines = rawText.split('\n');
    const cleanedLines: string[] = [];
    for (const line of lines) {
      if (line.trim() === '') continue;
      cleanedLines.push(line);
    }

    const verseText = cleanedLines.join('\n').trim();
    if (!verseText) continue;

    const heading = pendingHeadings.length > 0 ? pendingHeadings.join('\n') : undefined;
    const paragraphBreak = pendingParagraphBreak;
    pendingHeadings = [];
    pendingParagraphBreak = false;

    verses.push({
      book: bookName,
      chapter,
      verse: verseNum,
      text: verseText,
      ...(heading ? { heading } : {}),
      ...(stanzaBreak ? { stanzaBreak: true } : {}),
      ...(paragraphBreak && !heading && !stanzaBreak ? { paragraphBreak: true } : {}),
    });

    // Queue paragraph break for next verse if this one ends with \n\n
    if (endsWithParagraphBreak && !headingAtEndMatch) {
      pendingParagraphBreak = true;
    }
  }

  return verses;
}

// --- API.Bible (NASB1995, CSB, NLT) ---

async function fetchFromApiBible(
  bookName: string,
  chapter: number,
  translationKey: string
): Promise<Verse[]> {
  const { scriptureApiKey } = getApiKeys();
  if (!scriptureApiKey) {
    throw new Error(
      'Scripture API key not configured. Go to Settings to add your key.'
    );
  }

  const bibleId = BIBLE_IDS[translationKey];
  if (!bibleId) {
    throw new Error(`Unknown translation: ${translationKey}`);
  }

  const usfmId = USFM_BOOK_IDS[bookName];
  if (!usfmId) {
    throw new Error(`Unknown book: ${bookName}`);
  }
  const chapterId = `${usfmId}.${chapter}`;

  // Fetch full chapter HTML in one request (includes headings + verse numbers)
  const response = await fetch(
    `${SCRIPTURE_BASE}/bibles/${bibleId}/chapters/${chapterId}?content-type=html&include-notes=false&include-titles=true&include-chapter-numbers=false&include-verse-numbers=true`,
    { headers: { 'api-key': scriptureApiKey } }
  );

  if (!response.ok) {
    throw new Error(`API.Bible error: ${response.status}`);
  }

  const data = await response.json();
  const html: string = data.data?.content || '';

  return parseApiBibleHtml(html, bookName, chapter);
}

function parseApiBibleHtml(html: string, bookName: string, chapter: number): Verse[] {
  const verses: Verse[] = [];

  // Step 1: Extract section headings and mark their positions
  // Headings use <p class="s">, <p class="s1">, <h1>-<h4>, etc.
  const headingPositions: { pos: number; text: string }[] = [];
  const headingPattern = /<(?:h[1-4]|p)\b[^>]*class="s\d?"[^>]*>([\s\S]*?)<\/(?:h[1-4]|p)>/gi;
  let hm;
  while ((hm = headingPattern.exec(html)) !== null) {
    headingPositions.push({ pos: hm.index, text: stripHtmlTags(hm[1]).trim() });
  }
  // Also match actual h1-h4 tags (without class="s")
  const hTagPattern = /<(h[1-4])\b[^>]*>([\s\S]*?)<\/\1>/gi;
  while ((hm = hTagPattern.exec(html)) !== null) {
    const text = stripHtmlTags(hm[2]).trim();
    if (text && !headingPositions.some((h) => h.pos === hm!.index)) {
      headingPositions.push({ pos: hm.index, text });
    }
  }

  // Step 2: Find all verse markers and their positions
  const verseMarkers: { pos: number; num: number }[] = [];
  const markerPattern = /<span[^>]*data-number="(\d+)"[^>]*class="v"[^>]*>\d+<\/span>/gi;
  let vm;
  while ((vm = markerPattern.exec(html)) !== null) {
    verseMarkers.push({ pos: vm.index + vm[0].length, num: parseInt(vm[1], 10) });
  }

  // Step 3: Find all paragraph break positions (<p> tags with class "p" or similar)
  const paragraphBreaks = new Set<number>();
  const pTagPattern = /<p\b[^>]*class="p"[^>]*>/gi;
  let pm;
  while ((pm = pTagPattern.exec(html)) !== null) {
    paragraphBreaks.add(pm.index);
  }

  // Step 4: For each verse, extract text from its marker position to the next verse marker
  for (let i = 0; i < verseMarkers.length; i++) {
    const marker = verseMarkers[i];
    const nextMarker = verseMarkers[i + 1];
    const startPos = marker.pos;
    const endPos = nextMarker ? nextMarker.pos : html.length;

    // Find the raw HTML for this verse — go back to find the full span end,
    // then take everything until the next verse span
    const rawSegment = html.slice(startPos, endPos);

    // Strip the next verse's span tag if it's included
    const nextSpanIdx = rawSegment.search(/<span[^>]*data-number="/i);
    const verseHtml = nextSpanIdx >= 0 ? rawSegment.slice(0, nextSpanIdx) : rawSegment;

    // Strip HTML tags, clean whitespace
    const verseText = stripHtmlTags(verseHtml).replace(/\s+/g, ' ').trim();
    if (!verseText) continue;

    // Check for heading before this verse
    const heading = headingPositions.find(
      (h) => h.pos < startPos && (i === 0 || h.pos > verseMarkers[i - 1].pos)
    );

    // Check for paragraph break between previous verse and this one
    let hasParagraphBreak = false;
    if (i > 0) {
      const prevEnd = verseMarkers[i - 1].pos;
      const segmentBetween = html.slice(prevEnd, startPos);
      hasParagraphBreak = /<\/p>\s*<p\b/i.test(segmentBetween);
    }

    verses.push({
      book: bookName,
      chapter,
      verse: marker.num,
      text: verseText,
      ...(heading ? { heading: heading.text } : {}),
      ...(hasParagraphBreak ? { paragraphBreak: true } : {}),
    });
  }

  return verses;
}

function stripHtmlTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

// --- Cache & public API ---

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const bundledData: Record<string, any> = {};

async function loadBundledTranslation(translation: string): Promise<boolean> {
  if (bundledData[translation]) return true;
  try {
    const modules: Record<string, () => Promise<unknown>> = {
      ESV: () => import('../data/bible-text-ESV.json').catch(() => null),
      NASB1995: () => import('../data/bible-text-NASB1995.json').catch(() => null),
      CSB: () => import('../data/bible-text-CSB.json').catch(() => null),
      NLT: () => import('../data/bible-text-NLT.json').catch(() => null),
    };
    const loader = modules[translation];
    if (!loader) return false;
    const mod = await loader() as Record<string, unknown> | null;
    if (!mod) return false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bundledData[translation] = (mod as any).default || mod;
    return true;
  } catch {
    return false;
  }
}

function getBundledChapter(bookName: string, chapter: number, translation: string): Verse[] | null {
  const translationData = bundledData[translation];
  if (!translationData) return null;
  const bookData = translationData[bookName];
  if (!bookData) return null;
  const chapterData = bookData[String(chapter)];
  if (!chapterData || chapterData.length === 0) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return chapterData.map((v: any) => ({
    book: bookName,
    chapter,
    verse: v.verse,
    text: v.text,
    ...(v.heading ? { heading: v.heading } : {}),
    ...(v.paragraphBreak ? { paragraphBreak: true } : {}),
    ...(v.stanzaBreak ? { stanzaBreak: true } : {}),
  }));
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

  const hasBundled = await loadBundledTranslation(translation);
  if (hasBundled) {
    const bundled = getBundledChapter(bookName, chapter, translation);
    if (bundled) {
      cache.set(cacheKey, bundled);
      return bundled;
    }
  }

  let verses: Verse[];
  if (translation === 'ESV') {
    verses = await fetchESV(bookName, chapter);
  } else {
    verses = await fetchFromApiBible(bookName, chapter, translation);
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
