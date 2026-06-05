import type { MemoryProgress } from '../types';

const STORAGE_KEY = 'bible-app-memory-progress';
const CUSTOM_STORAGE_KEY = 'bible-app-custom-memory-progress';

// --- Fighter Verses progress (keyed by week number) ---

export function getMemoryProgress(): MemoryProgress[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveMemoryProgress(progress: MemoryProgress[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function getProgressForWeek(week: number): MemoryProgress | undefined {
  return getMemoryProgress().find((p) => p.week === week);
}

export function updateProgressForWeek(
  week: number,
  reference: string,
  score: number
): MemoryProgress {
  const all = getMemoryProgress();
  const existing = all.find((p) => p.week === week);

  const updated: MemoryProgress = existing
    ? {
        ...existing,
        attempts: existing.attempts + 1,
        bestScore: Math.max(existing.bestScore, score),
        lastAttempt: new Date().toISOString(),
      }
    : {
        week,
        reference,
        attempts: 1,
        bestScore: score,
        lastAttempt: new Date().toISOString(),
      };

  const newAll = existing ? all.map((p) => (p.week === week ? updated : p)) : [...all, updated];
  saveMemoryProgress(newAll);
  return updated;
}

// --- Custom Memory Verses progress (keyed by verse id) ---

export interface CustomVerseProgress {
  verseId: string;
  bestScore: number;
  lastAttempt: string | null;
}

function getCustomProgressAll(): CustomVerseProgress[] {
  try {
    const stored = localStorage.getItem(CUSTOM_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveCustomProgressAll(progress: CustomVerseProgress[]): void {
  localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(progress));
}

export function getProgressForCustomVerse(verseId: string): CustomVerseProgress | undefined {
  return getCustomProgressAll().find((p) => p.verseId === verseId);
}

export function updateProgressForCustomVerse(
  verseId: string,
  score: number
): CustomVerseProgress {
  const all = getCustomProgressAll();
  const existing = all.find((p) => p.verseId === verseId);

  const updated: CustomVerseProgress = existing
    ? {
        ...existing,
        bestScore: Math.max(existing.bestScore, score),
        lastAttempt: new Date().toISOString(),
      }
    : {
        verseId,
        bestScore: score,
        lastAttempt: new Date().toISOString(),
      };

  const newAll = existing
    ? all.map((p) => (p.verseId === verseId ? updated : p))
    : [...all, updated];
  saveCustomProgressAll(newAll);
  return updated;
}
