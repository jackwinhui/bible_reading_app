import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  type ReactNode,
} from 'react';
import type { JournalEntry, JournalBlock, VerseRef } from '../types';

interface JournalContextType {
  entries: JournalEntry[];
  createEntry: (init?: Partial<JournalEntry>) => JournalEntry;
  updateEntry: (id: string, patch: Partial<JournalEntry>) => void;
  removeEntry: (id: string) => void;
  getEntry: (id: string) => JournalEntry | undefined;
  /** All entries that reference the given verse (anywhere in the range). */
  getEntriesForVerse: (book: string, chapter: number, verse: number) => JournalEntry[];
  importEntries: (entries: JournalEntry[], mode: 'merge' | 'replace') => void;
  exportEntries: () => string;
}

const STORAGE_KEY = 'bible-app-journal';
const JournalContext = createContext<JournalContextType | undefined>(undefined);

function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function JournalProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<JournalEntry[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? (JSON.parse(stored) as JournalEntry[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

  // Reverse-index: "book|chapter|verse" -> entry IDs
  const verseIndex = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const entry of entries) {
      for (const ref of entry.verseRefs) {
        const end = ref.verseEnd ?? ref.verseStart;
        for (let v = ref.verseStart; v <= end; v++) {
          const key = `${ref.book}|${ref.chapter}|${v}`;
          if (!map.has(key)) map.set(key, new Set());
          map.get(key)!.add(entry.id);
        }
      }
    }
    return map;
  }, [entries]);

  const createEntry = useCallback((init?: Partial<JournalEntry>) => {
    const now = new Date().toISOString();
    const body: JournalBlock[] = init?.body ?? [
      { id: newId(), type: 'text', content: '' },
    ];
    const entry: JournalEntry = {
      id: newId(),
      date: init?.date ?? todayISO(),
      createdAt: now,
      updatedAt: now,
      title: init?.title,
      body,
      verseRefs: init?.verseRefs ?? extractRefs(body),
      tags: init?.tags,
      mood: init?.mood,
    };
    setEntries((prev) => [entry, ...prev]);
    return entry;
  }, []);

  const updateEntry = useCallback((id: string, patch: Partial<JournalEntry>) => {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        const merged = { ...e, ...patch, updatedAt: new Date().toISOString() };
        if (patch.body) merged.verseRefs = extractRefs(patch.body);
        return merged;
      })
    );
  }, []);

  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const getEntry = useCallback(
    (id: string) => entries.find((e) => e.id === id),
    [entries]
  );

  const getEntriesForVerse = useCallback(
    (book: string, chapter: number, verse: number): JournalEntry[] => {
      const key = `${book}|${chapter}|${verse}`;
      const ids = verseIndex.get(key);
      if (!ids) return [];
      return entries
        .filter((e) => ids.has(e.id))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },
    [entries, verseIndex]
  );

  const importEntries = useCallback(
    (incoming: JournalEntry[], mode: 'merge' | 'replace') => {
      setEntries((prev) => {
        if (mode === 'replace') return incoming;
        const byId = new Map(prev.map((e) => [e.id, e]));
        for (const e of incoming) byId.set(e.id, e);
        return Array.from(byId.values()).sort((a, b) =>
          b.updatedAt.localeCompare(a.updatedAt)
        );
      });
    },
    []
  );

  const exportEntries = useCallback(() => JSON.stringify(entries, null, 2), [entries]);

  return (
    <JournalContext.Provider
      value={{
        entries,
        createEntry,
        updateEntry,
        removeEntry,
        getEntry,
        getEntriesForVerse,
        importEntries,
        exportEntries,
      }}
    >
      {children}
    </JournalContext.Provider>
  );
}

function extractRefs(body: JournalBlock[]): VerseRef[] {
  const refs: VerseRef[] = [];
  for (const block of body) {
    if (block.type === 'verse') refs.push(block.ref);
  }
  return refs;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useJournal() {
  const ctx = useContext(JournalContext);
  if (!ctx) throw new Error('useJournal must be used within JournalProvider');
  return ctx;
}

// eslint-disable-next-line react-refresh/only-export-components
export { newId as newJournalBlockId };
