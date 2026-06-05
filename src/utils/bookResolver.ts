import { books } from '../data/books';

/**
 * Robust book name resolver. Matches the full book name, the official
 * abbrev from the book list, and a curated set of common aliases —
 * case- and punctuation-insensitive ("Jn", "1cor", "1 Cor.", "Psalm",
 * "Rom", etc.).
 */
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

function normalize(s: string): string {
  return s.toLowerCase().replace(/\./g, '').replace(/\s+/g, '').trim();
}

const index = (() => {
  const map = new Map<string, string>();
  for (const b of books) {
    map.set(normalize(b.name), b.name);
    map.set(normalize(b.abbrev), b.name);
    const aliases = aliasGroups[b.name] ?? [];
    for (const a of aliases) map.set(normalize(a), b.name);
  }
  return map;
})();

export function resolveBookName(raw: string): string | null {
  return index.get(normalize(raw)) ?? null;
}

/**
 * Parse a free-form reference like "John 3:16", "1 Cor 13:4-7", "Ps 23".
 * Returns null if unparseable.
 */
export function parseReference(s: string): {
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd?: number;
} | null {
  const m = /^\s*([1-3]?\s*[A-Za-z][A-Za-z. ]*?)\s*\.?\s*(\d+)(?:\s*[:.\s]\s*(\d+)(?:\s*[-\u2013\u2014]\s*(\d+))?)?\s*$/.exec(s);
  if (!m) return null;
  const bookName = resolveBookName(m[1]);
  if (!bookName) return null;
  return {
    book: bookName,
    chapter: parseInt(m[2], 10),
    verseStart: m[3] ? parseInt(m[3], 10) : 1,
    verseEnd: m[4] ? parseInt(m[4], 10) : undefined,
  };
}

export function formatReference(book: string, chapter: number, verseStart: number, verseEnd?: number | null): string {
  const range = verseEnd && verseEnd > verseStart ? `${verseStart}-${verseEnd}` : `${verseStart}`;
  return `${book} ${chapter}:${range}`;
}
