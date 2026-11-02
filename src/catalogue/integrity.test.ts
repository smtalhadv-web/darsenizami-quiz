/**
 * Integrity checks on the generated catalogue and question set.
 * These guard the rules in docs/RULES.md §1–2 at build time.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Catalogue } from './index';
import type { Question } from '../session/types';

const ROOT = join(__dirname, '..', '..');

let cat: Catalogue;
let questions: Question[];

beforeAll(() => {
  cat = JSON.parse(readFileSync(join(ROOT, 'public', 'catalogue.json'), 'utf8'));
  questions = JSON.parse(readFileSync(join(ROOT, 'public', 'questions.json'), 'utf8'));
});

describe('catalogue', () => {
  it('has all 14 year-levels, 8 banin and 6 banat', () => {
    expect(cat.years).toHaveLength(14);
    expect(cat.years.filter((y) => y.stream === 'banin')).toHaveLength(8);
    expect(cat.years.filter((y) => y.stream === 'banat')).toHaveLength(6);
  });

  it('gives every year a name in all three locales', () => {
    for (const y of cat.years) {
      expect(y.name.en, y.id).toBeTruthy();
      expect(y.name.ur, y.id).toBeTruthy();
      expect(y.name.ar, y.id).toBeTruthy();
    }
  });

  it('gives every book a unique id', () => {
    const ids = cat.books.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('scopes book ids by collection, so a shared slug is not collapsed', () => {
    // arabi-ka-muallim appears in both aula-1-matn and khasa-1-matn
    const shared = cat.books.filter((b) => b.slug === 'arabi-ka-muallim');
    expect(shared.length).toBeGreaterThan(1);
    expect(new Set(shared.map((b) => b.id)).size).toBe(shared.length);
  });

  it('excludes the malformed "D ownload" entries from the source site', () => {
    expect(cat.books.some((b) => /^D\s*ownload/i.test(b.title.en ?? ''))).toBe(false);
  });

  it('assigns every book to a year that exists', () => {
    const yearIds = new Set(cat.years.map((y) => y.id));
    for (const b of cat.books) expect(yearIds.has(b.year), b.id).toBe(true);
  });

  it('reports question counts that match the actual question set', () => {
    for (const b of cat.books) {
      const actual = questions.filter((q) => q.bookId === b.id).length;
      expect(b.questionCount, b.id).toBe(actual);
    }
  });

  it('reports year question counts as the sum of their books', () => {
    for (const y of cat.years) {
      const sum = cat.books
        .filter((b) => b.year === y.id)
        .reduce((n, b) => n + b.questionCount, 0);
      expect(y.questionCount, y.id).toBe(sum);
    }
  });
});

describe('questions', () => {
  it('has a unique id for every question', () => {
    const ids = questions.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('attaches every question to a book that exists in the catalogue', () => {
    const bookIds = new Set(cat.books.map((b) => b.id));
    for (const q of questions) expect(bookIds.has(q.bookId), `${q.id} -> ${q.bookId}`).toBe(true);
  });

  it('gives every question a source reference (RULES R1.3)', () => {
    for (const q of questions) {
      expect(q.source, q.id).toBeTruthy();
      expect(Boolean(q.source.page || q.source.section), q.id).toBe(true);
    }
  });

  it('gives every question exactly one correct option that is among its options', () => {
    for (const q of questions) {
      const ids = q.options.map((o) => o.id);
      expect(new Set(ids).size, q.id).toBe(ids.length);
      expect(ids, q.id).toContain(q.correctOptionId);
    }
  });

  it('gives every question at least four options (RULES Q-6)', () => {
    for (const q of questions) expect(q.options.length, q.id).toBeGreaterThanOrEqual(4);
  });

  it('gives every question an explanation', () => {
    for (const q of questions) {
      const e = q.explanation;
      expect(Boolean(e.en || e.ur || e.ar), q.id).toBe(true);
    }
  });

  it('labels every unverified question as demo-unverified, never as authored', () => {
    // Nothing in the prototype has been checked against a printed book, so no
    // question may currently claim 'authored' or 'drafted' provenance.
    for (const q of questions) expect(q.origin, q.id).toBe('demo-unverified');
  });

  it('claims no page number on an unverified question', () => {
    // A fabricated page reference would be worse than none (RULES R1.4).
    for (const q of questions) {
      if (q.origin === 'demo-unverified') expect(q.source.page, q.id).toBeUndefined();
    }
  });
});
