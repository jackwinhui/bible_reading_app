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

export type Translation = 'ESV' | 'NASB1995';

export type Theme = 'light' | 'dark';
