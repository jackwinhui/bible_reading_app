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

export type Theme = 'light' | 'dark';

// --- Journal ---

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
  verseRefs: VerseRef[]; // denormalized for reverse lookup
  tags?: string[];
  mood?: string;
}
