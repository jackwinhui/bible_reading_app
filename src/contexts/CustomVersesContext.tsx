import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { CustomMemoryVerse } from '../types';

interface CustomVersesContextType {
  verses: CustomMemoryVerse[];
  addVerse: (init: Omit<CustomMemoryVerse, 'id' | 'createdAt' | 'updatedAt'>) => CustomMemoryVerse;
  updateVerse: (id: string, patch: Partial<Omit<CustomMemoryVerse, 'id' | 'createdAt'>>) => void;
  removeVerse: (id: string) => void;
  getVerse: (id: string) => CustomMemoryVerse | undefined;
}

const STORAGE_KEY = 'bible-app-custom-verses';
const CustomVersesContext = createContext<CustomVersesContextType | undefined>(undefined);

function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function CustomVersesProvider({ children }: { children: ReactNode }) {
  const [verses, setVerses] = useState<CustomMemoryVerse[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? (JSON.parse(stored) as CustomMemoryVerse[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(verses));
  }, [verses]);

  const addVerse = useCallback(
    (init: Omit<CustomMemoryVerse, 'id' | 'createdAt' | 'updatedAt'>) => {
      const now = new Date().toISOString();
      const verse: CustomMemoryVerse = { ...init, id: newId(), createdAt: now, updatedAt: now };
      setVerses((prev) => [verse, ...prev]);
      return verse;
    },
    []
  );

  const updateVerse = useCallback(
    (id: string, patch: Partial<Omit<CustomMemoryVerse, 'id' | 'createdAt'>>) => {
      setVerses((prev) =>
        prev.map((v) =>
          v.id === id ? { ...v, ...patch, updatedAt: new Date().toISOString() } : v
        )
      );
    },
    []
  );

  const removeVerse = useCallback((id: string) => {
    setVerses((prev) => prev.filter((v) => v.id !== id));
  }, []);

  const getVerse = useCallback(
    (id: string) => verses.find((v) => v.id === id),
    [verses]
  );

  return (
    <CustomVersesContext.Provider
      value={{ verses, addVerse, updateVerse, removeVerse, getVerse }}
    >
      {children}
    </CustomVersesContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCustomVerses() {
  const ctx = useContext(CustomVersesContext);
  if (!ctx) throw new Error('useCustomVerses must be used within CustomVersesProvider');
  return ctx;
}
