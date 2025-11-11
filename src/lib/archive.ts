import { isClient } from 'next-utils';

export const ARCHIVE_STORAGE_KEY = 'dashboard-archived-projects';

export function loadArchivedProjectIds(): number[] {
  if (!isClient()) return [];
  try {
    const stored = window.localStorage.getItem(ARCHIVE_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0);
  } catch {
    return [];
  }
}

export function saveArchivedProjectIds(ids: number[]) {
  if (!isClient()) return;
  window.localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(ids));
}
