export interface BibleBook {
  id: number;
  name: string;
  abbrev: string;
  chapters: number;
  testament: 'OT' | 'NT';
}

export interface Verse {
  book: string;
  chapter: number;
  verse: number;
  text: string;
  heading?: string;
  paragraphBreak?: boolean;
  stanzaBreak?: boolean;
}

export interface Bookmark {
  id: string;
  book: string;
  chapter: number;
  verse: number;
  translation: Translation;
  text: string;
  createdAt: string;
}

export interface Annotation {
  id: string;
  book: string;
  chapter: number;
  verse: number;
  note: string;
  verseText: string;
  createdAt: string;
  updatedAt: string;
}

export interface FighterVerse {
  week: number;
  reference: string;
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd: number | null;
}

export interface MemoryProgress {
  week: number;
  reference: string;
  attempts: number;
  bestScore: number;
  lastAttempt: string | null;
}

export type Translation = 'ESV' | 'NASB1995' | 'CSB' | 'NLT';

// --- Commentary (Enduring Word) ---

export interface CommentaryParagraph {
  indent: number; // 0, 1, or 2 — nesting level from the source padding
  html: string;   // sanitized inline HTML (em/strong/b/i/br only)
}

export interface CommentarySection {
  id: string;
  level: 'section' | 'point'; // 'section' = lettered (A./B.), 'point' = numbered
  heading: string;
  verses: [number, number] | null; // verse range this section covers, if any
  paragraphs: CommentaryParagraph[];
}

export interface CommentaryChapter {
  book: string;
  chapter: number;
  source: 'Enduring Word';
  url: string;
  sections: CommentarySection[];
  grouped?: boolean;        // true if Enduring Word combines several chapters on one page
  groupChapters?: number[]; // the chapters covered by that combined page
}

export type Theme = 'light' | 'dark';

// --- Custom Memory Verses ---

export interface CustomMemoryVerse {
  id: string;
  title: string;          // user-given title (e.g., "Christ in You")
  reference: string;      // formatted reference (e.g., "Colossians 1:27")
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd: number | null;
  translation: Translation;
  description?: string;   // explanation / notes
  createdAt: string;
  updatedAt: string;
}

export interface VerseRef {
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd?: number;
  translation: Translation;
}

export type JournalBlock =
  | { id: string; type: 'text'; content: string }
  | { id: string; type: 'verse'; ref: VerseRef; snapshot: string };

export interface JournalEntry {
  id: string;
  date: string;          // YYYY-MM-DD
  createdAt: string;     // ISO
  updatedAt: string;     // ISO
  title?: string;
  body: JournalBlock[];
  prayer?: string;       // HTML; "Prayer / Applications" section
  verseRefs: VerseRef[]; // denormalized for reverse lookup
  tags?: string[];
  mood?: string;
}
