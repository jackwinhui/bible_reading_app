import { createContext, useContext, useState, useEffect, type ReactNode, useCallback } from 'react';
import type { Bookmark, Translation } from '../types';

interface BookmarkContextType {
  bookmarks: Bookmark[];
  addBookmark: (book: string, chapter: number, verse: number, translation: Translation, text: string) => void;
  removeBookmark: (id: string) => void;
  isBookmarked: (book: string, chapter: number, verse: number) => boolean;
  getBookmark: (book: string, chapter: number, verse: number) => Bookmark | undefined;
}

const STORAGE_KEY = 'bible-app-bookmarks';
const BookmarkContext = createContext<BookmarkContextType | undefined>(undefined);

export function BookmarkProvider({ children }: { children: ReactNode }) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
  }, [bookmarks]);

  const addBookmark = useCallback(
    (book: string, chapter: number, verse: number, translation: Translation, text: string) => {
      const id = `${book}-${chapter}-${verse}`;
      setBookmarks((prev) => {
        if (prev.some((b) => b.id === id)) return prev;
        return [...prev, { id, book, chapter, verse, translation, text, createdAt: new Date().toISOString() }];
      });
    },
    []
  );

  const removeBookmark = useCallback((id: string) => {
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const isBookmarked = useCallback(
    (book: string, chapter: number, verse: number) => {
      return bookmarks.some((b) => b.id === `${book}-${chapter}-${verse}`);
    },
    [bookmarks]
  );

  const getBookmark = useCallback(
    (book: string, chapter: number, verse: number) => {
      return bookmarks.find((b) => b.id === `${book}-${chapter}-${verse}`);
    },
    [bookmarks]
  );

  return (
    <BookmarkContext.Provider value={{ bookmarks, addBookmark, removeBookmark, isBookmarked, getBookmark }}>
      {children}
    </BookmarkContext.Provider>
  );
}

export function useBookmarks() {
  const ctx = useContext(BookmarkContext);
  if (!ctx) throw new Error('useBookmarks must be used within BookmarkProvider');
  return ctx;
}
