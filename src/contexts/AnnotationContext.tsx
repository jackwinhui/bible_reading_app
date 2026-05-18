import { createContext, useContext, useState, useEffect, type ReactNode, useCallback } from 'react';
import type { Annotation } from '../types';

interface AnnotationContextType {
  annotations: Annotation[];
  addAnnotation: (book: string, chapter: number, verse: number, note: string, verseText: string) => void;
  updateAnnotation: (id: string, note: string) => void;
  removeAnnotation: (id: string) => void;
  getAnnotation: (book: string, chapter: number, verse: number) => Annotation | undefined;
  hasAnnotation: (book: string, chapter: number, verse: number) => boolean;
}

const STORAGE_KEY = 'bible-app-annotations';
const AnnotationContext = createContext<AnnotationContextType | undefined>(undefined);

export function AnnotationProvider({ children }: { children: ReactNode }) {
  const [annotations, setAnnotations] = useState<Annotation[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(annotations));
  }, [annotations]);

  const addAnnotation = useCallback(
    (book: string, chapter: number, verse: number, note: string, verseText: string) => {
      const id = `${book}-${chapter}-${verse}`;
      const now = new Date().toISOString();
      setAnnotations((prev) => {
        const existing = prev.find((a) => a.id === id);
        if (existing) {
          return prev.map((a) => (a.id === id ? { ...a, note, updatedAt: now } : a));
        }
        return [...prev, { id, book, chapter, verse, note, verseText, createdAt: now, updatedAt: now }];
      });
    },
    []
  );

  const updateAnnotation = useCallback((id: string, note: string) => {
    setAnnotations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, note, updatedAt: new Date().toISOString() } : a))
    );
  }, []);

  const removeAnnotation = useCallback((id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const getAnnotation = useCallback(
    (book: string, chapter: number, verse: number) => {
      return annotations.find((a) => a.id === `${book}-${chapter}-${verse}`);
    },
    [annotations]
  );

  const hasAnnotation = useCallback(
    (book: string, chapter: number, verse: number) => {
      return annotations.some((a) => a.id === `${book}-${chapter}-${verse}`);
    },
    [annotations]
  );

  return (
    <AnnotationContext.Provider
      value={{ annotations, addAnnotation, updateAnnotation, removeAnnotation, getAnnotation, hasAnnotation }}
    >
      {children}
    </AnnotationContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAnnotations() {
  const ctx = useContext(AnnotationContext);
  if (!ctx) throw new Error('useAnnotations must be used within AnnotationProvider');
  return ctx;
}
