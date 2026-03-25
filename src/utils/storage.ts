import type { MemoryProgress } from '../types';

const STORAGE_KEY = 'bible-app-memory-progress';

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
