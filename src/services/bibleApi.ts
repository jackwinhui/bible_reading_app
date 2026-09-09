import type { Verse, Translation } from '../types';
import { getBookByName } from '../data/books';
import { getDefaultApiKeys, type ApiKeys } from '../utils/apiKeys';

const ESV_BASE = 'https://api.esv.org/v3/passage/text/';
const SCRIPTURE_BASE = 'https://rest.api.bible/v1';

function getApiKeys(): ApiKeys {
  const defaults = getDefaultApiKeys();
  try {
    const stored = localStorage.getItem('bible-app-api-keys');
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        esvApiKey: parsed.esvApiKey || defaults.esvApiKey,
        scriptureApiKey: parsed.scriptureApiKey || defaults.scriptureApiKey,
      };
    }
  } catch { /* ignore */ }
  return defaults;
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

  const query = getBookByName(bookName)?.chapters === 1 ? bookName : `${bookName} ${chapter}`;
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
  const parts = text.replace(/\r\n?/g, '\n').split(/\[(\d+)\]/);

  // Extract headings from preamble (before first verse)
  let pendingHeadings: string[] = [];
  let pendingParagraphBreak = false;
  let pendingStanzaBreak = false;

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

    const heading = pendingHeadings.length > 0 ? pendingHeadings.join('\n') : undefined;
    const paragraphBreak = pendingParagraphBreak;
    const stanzaBreak = pendingStanzaBreak;
    pendingHeadings = [];

    // Headings after this verse's text belong to the next verse.
    const headingAtEndMatch = rawText.match(/\n[ \t]*\n([A-Z][^\n]*(?:\n(?:[ \t]*\n)*[A-Z][^\n]*)*)\s*$/);
    if (headingAtEndMatch) {
      const headingBlock = headingAtEndMatch[1].trim();
      const headings = headingBlock
        .split(/\n\n+/)
        .map((h) => h.trim())
        .filter((h) => h.length > 0);
      rawText = rawText.slice(0, headingAtEndMatch.index);
      pendingHeadings = headings;
    }

    pendingParagraphBreak = /\n[ \t]*\n[ \t]*$/.test(rawText);
    pendingStanzaBreak = /\n[ \t]*\n[ \t]*\n[ \t]*$/.test(rawText);

    // Clean up the verse text while preserving poetry line structure
    const lines = rawText.split('\n');
    const cleanedLines: string[] = [];
    for (const line of lines) {
      if (line.trim() === '') continue;
      cleanedLines.push(line);
    }

    const verseText = cleanedLines.join('\n').trim();
    if (!verseText) continue;

    verses.push({
      book: bookName,
      chapter,
      verse: verseNum,
      text: verseText,
      ...(heading ? { heading } : {}),
      ...(stanzaBreak ? { stanzaBreak: true } : {}),
      ...(paragraphBreak && !heading && !stanzaBreak ? { paragraphBreak: true } : {}),
    });
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
  const headingPositions: { pos: number; end: number; text: string }[] = [];
  const headingPattern = /<(h[1-4]|p)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
  let hm;
  while ((hm = headingPattern.exec(html)) !== null) {
    const isHeading = hm[1].toLowerCase() !== 'p' || /\bs\d?\b/.test(getHtmlClass(hm[2]));
    const text = isHeading ? stripHtmlTags(hm[3]).trim() : '';
    if (text) {
      headingPositions.push({ pos: hm.index, end: headingPattern.lastIndex, text });
    }
  }

  // Step 2: Find all verse markers and their positions
  const verseMarkers: { start: number; pos: number; num: number }[] = [];
  const markerPattern = /<span\b([^>]*)>\s*\d+\s*<\/span>/gi;
  let vm;
  while ((vm = markerPattern.exec(html)) !== null) {
    const numberMatch = /(?:^|\s)data-number\s*=\s*["'](\d+)["']/i.exec(vm[1]);
    if (numberMatch && getHtmlClass(vm[1]).split(/\s+/).includes('v')) {
      verseMarkers.push({
        start: vm.index,
        pos: vm.index + vm[0].length,
        num: parseInt(numberMatch[1], 10),
      });
    }
  }

  // A heading can split a verse, so remove its element without discarding the continuation.
  for (let i = 0; i < verseMarkers.length; i++) {
    const marker = verseMarkers[i];
    const nextMarker = verseMarkers[i + 1];
    const startPos = marker.pos;
    const endPos = nextMarker ? nextMarker.start : html.length;
    let verseHtml = '';
    let cursor = startPos;
    for (const heading of headingPositions) {
      if (heading.pos < startPos || heading.pos >= endPos) continue;
      verseHtml += html.slice(cursor, heading.pos) + ' ';
      cursor = heading.end;
    }
    verseHtml += html.slice(cursor, endPos);

    // The verse marker often sits INSIDE its first paragraph (e.g.
    //   <p class="q"><span class="v">1</span>First line</p><p class="q">Second line</p>
    // So `verseHtml` typically begins with the first line's text and a stray
    // </p>. Look back in the full HTML to find the <p> that encloses the
    // marker; capture its class so the leading orphan text can be re-wrapped
    // as if it were a complete paragraph (preserves poetry line structure).
    let leadingClass = '';
    const before = html.slice(0, startPos);
    // Find the last <p ...> before this marker that hasn't been closed
    const lastOpenP = before.lastIndexOf('<p');
    if (lastOpenP >= 0) {
      const afterOpen = before.slice(lastOpenP);
      const closeIdx = afterOpen.indexOf('</p>');
      // If there's no </p> between the open tag and the marker, the marker
      // is inside this <p>. Capture its class.
      if (closeIdx === -1) {
        const m = /<p\b([^>]*)>/.exec(afterOpen);
        leadingClass = m ? getHtmlClass(m[1]) : '';
      }
    }
    // Wrap the orphan leading text (everything before the first </p>) so
    // htmlToVerseText sees a complete paragraph and applies the right class.
    let segmentForParsing = verseHtml;
    if (leadingClass) {
      const firstClose = verseHtml.indexOf('</p>');
      if (firstClose >= 0) {
        const orphan = verseHtml.slice(0, firstClose);
        const rest = verseHtml.slice(firstClose + 4);
        segmentForParsing = `<p class="${leadingClass}">${orphan}</p>${rest}`;
      }
    }

    // Preserve poetry line structure: API.Bible uses <p class="q1"> for the
    // first poetic line and <p class="q2"> for the indented continuation.
    // We replace those with newlines + leading spaces that the reader
    // converts to visual indents (4 spaces -> pl-4, 8 spaces -> pl-8).
    const verseText = htmlToVerseText(segmentForParsing);
    if (!verseText) continue;

    // Check for heading before this verse
    const heading = headingPositions.filter(
      (h) => h.pos < startPos && (i === 0 || h.pos > verseMarkers[i - 1].pos)
    ).map((h) => h.text).join('\n');

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
      ...(heading ? { heading } : {}),
      ...(hasParagraphBreak ? { paragraphBreak: true } : {}),
    });
  }

  return verses;
}

function getHtmlClass(attributes: string): string {
  return /(?:^|\s)class\s*=\s*(["'])([\s\S]*?)\1/i.exec(attributes)?.[2] ?? '';
}

/**
 * Convert API.Bible verse HTML to text while preserving poetry line breaks.
 * Each <p> within the verse becomes its own line. <p class="q\d"> paragraphs
 * (poetic lines) get leading spaces that the reader treats as indent levels.
 */
function htmlToVerseText(html: string): string {
  // Walk the html and turn each <p ...> ... </p> chunk into either:
  //   - "<spaces><text>\n" for poetry (q1, q2, ...)
  //   - "<text> " for prose
  // Anything outside <p> tags is collected as-is between paragraph chunks.
  const parts: string[] = [];

  // Match every opening <p ...> and grab its class (if any) + its inner HTML
  const pRe = /<p\b([^>]*)>([\s\S]*?)<\/p>/gi;
  let lastEnd = 0;
  let m: RegExpExecArray | null;
  while ((m = pRe.exec(html)) !== null) {
    // Any HTML before this <p> (e.g., text right after the verse marker but
    // before its enclosing <p> closes — rare, but happens when the verse
    // marker sits inside a paragraph that started before it)
    if (m.index > lastEnd) {
      const between = html.slice(lastEnd, m.index);
      const cleaned = stripHtmlTags(between).replace(/[ \t]+/g, ' ').trim();
      if (cleaned) parts.push(cleaned + ' ');
    }
    const attrs = m[1];
    const inner = m[2];
    const className = getHtmlClass(attrs);
    const text = stripHtmlTags(inner).replace(/[ \t]+/g, ' ').trim();
    if (!text) {
      lastEnd = pRe.lastIndex;
      continue;
    }
    // Poetry classes: q, q1, q2, q3, q4, qr, qc, ...
    const qMatch = /\bq([1-4])?\b/.exec(className);
    if (qMatch) {
      const level = qMatch[1] ? parseInt(qMatch[1], 10) : 1;
      // 4 spaces per level — the reader maps >=4 to pl-4 and >=8 to pl-8
      const indent = ' '.repeat(Math.min(level, 2) * 4);
      parts.push(`${indent}${text}\n`);
    } else {
      // Prose paragraph — emit as a regular line (followed by space; the
      // outer trim/collapse handles inter-paragraph spacing)
      parts.push(`${text} `);
    }
    lastEnd = pRe.lastIndex;
  }
  // Tail content after the last </p>
  if (lastEnd < html.length) {
    const tail = stripHtmlTags(html.slice(lastEnd)).replace(/[ \t]+/g, ' ').trim();
    if (tail) parts.push(tail);
  }

  // Join, normalize whitespace, but preserve \n boundaries
  return parts
    .join('')
    .replace(/[ \t]+\n/g, '\n')  // trim trailing spaces on each line
    .replace(/\n+/g, '\n')        // collapse runs of newlines
    .trim();
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

// Bundled JSONs are large and license-restricted. Two build modes:
//   - DEV (`npm run dev`) and the "personal" production build
//     (`npm run electron:build`): bundles the JSONs for offline use.
//   - PUBLIC build (`npm run electron:build:public`): sets
//     VITE_PUBLIC_BUILD=1, which excludes the JSONs so the published DMG
//     doesn't redistribute the text. App falls back to live API fetches.
type BundledBible = Record<string, Record<string, Omit<Verse, 'book' | 'chapter'>[]>>;
const bundledData: Partial<Record<Translation, BundledBible>> = {};

async function loadBundledTranslation(translation: Translation): Promise<boolean> {
  if (import.meta.env.VITE_PUBLIC_BUILD === '1') return false;
  if (bundledData[translation]) return true;
  try {
    const modules = import.meta.glob<BundledBible>('../data/bible-text-*.json', { import: 'default' });
    const loader = modules[`../data/bible-text-${translation}.json`];
    if (!loader) return false;
    bundledData[translation] = await loader();
    return true;
  } catch {
    return false;
  }
}

function getBundledChapter(bookName: string, chapter: number, translation: Translation): Verse[] | null {
  const translationData = bundledData[translation];
  if (!translationData) return null;
  const bookData = translationData[bookName];
  if (!bookData) return null;
  const chapterData = bookData[String(chapter)];
  if (!chapterData || chapterData.length === 0) return null;

  return chapterData.map((v) => ({
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
  const book = getBookByName(bookName);
  if (!book) throw new Error(`Unknown book: ${bookName}`);
  if (!Number.isInteger(chapter) || chapter < 1 || chapter > book.chapters) {
    throw new Error(`Invalid chapter for ${book.name}: ${chapter}`);
  }
  bookName = book.name;

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

  if (verses.length === 0) {
    throw new Error(`No verses found for ${bookName} ${chapter} (${translation}).`);
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
  const end = verseEnd ?? verseStart;
  if (!Number.isInteger(verseStart) || !Number.isInteger(end) || verseStart < 1 || end < verseStart) {
    throw new Error('Please select a valid verse range.');
  }
  const allVerses = await fetchChapter(bookName, chapter, translation);
  const verses = allVerses.filter((v) => v.verse >= verseStart && v.verse <= end);
  if (verses.length === 0 || end > Math.max(...allVerses.map((v) => v.verse))) {
    throw new Error('No verses found for that reference or the verse range extends past the chapter.');
  }
  return verses;
}

export function getVerseText(verses: Verse[]): string {
  return verses.map((v) => v.text).join(' ');
}
