/**
 * Device-local progress. Never load-bearing: every accessor degrades to a
 * harmless default, because localStorage throws in private browsing and
 * returns nothing after site data is cleared (ARCHITECTURE §3.3).
 */

import type { Locale, Mode } from '../session/types';

const KEY = 'nisab.progress.v1';

export interface Attempt {
  bookId: string;
  mode: Mode;
  score: number;
  correct: number;
  total: number;
  passed: boolean;
  at: string;
}

export interface Progress {
  v: 1;
  attempts: Attempt[];
  locale: Locale | null;
}

const EMPTY: Progress = { v: 1, attempts: [], locale: null };

export function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Progress;
    if (parsed?.v !== 1 || !Array.isArray(parsed.attempts)) return EMPTY;
    return parsed;
  } catch {
    return EMPTY;
  }
}

function save(p: Progress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable — progress is a convenience, not a requirement */
  }
}

export function recordAttempt(attempt: Attempt): void {
  const p = load();
  // keep the 50 most recent
  save({ ...p, attempts: [attempt, ...p.attempts].slice(0, 50) });
}

export function attemptsFor(bookId: string): Attempt[] {
  return load().attempts.filter((a) => a.bookId === bookId);
}

export function getLocale(): Locale | null {
  return load().locale;
}

export function setLocale(locale: Locale): void {
  save({ ...load(), locale });
}
