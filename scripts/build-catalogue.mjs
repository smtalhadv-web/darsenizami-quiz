#!/usr/bin/env node
/**
 * Compile data/years.json + data/collections/*.txt into
 * public/catalogue.json, the single file the app reads (ARCHITECTURE D6).
 *
 * Also folds in approved question counts from data/questions/*.json so the
 * app can state real coverage without a network call (RULES R2.2).
 */

import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const COLLECTIONS_DIR = join(ROOT, 'data', 'collections');
const QUESTIONS_DIR = join(ROOT, 'data', 'questions');
const OUT = join(ROOT, 'public', 'catalogue.json');

const STREAMS = [
  { id: 'banin', name: { en: 'Banin', ur: 'بنین', ar: 'بنين' } },
  { id: 'banat', name: { en: 'Banat', ur: 'بنات', ar: 'بنات' } },
];

/** Arabic-script matn titles are the OCR-viable ones (MEMORY D2). */
function guessLanguage(kind, enTitle, urTitle) {
  if (/urdu|tarjama|tarjuma|sharh/i.test(enTitle)) return 'ur';
  if (kind === 'sharh') return 'ur';
  return 'ar';
}

async function readLines(path) {
  const raw = await readFile(path, 'utf8');
  return raw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
}

async function safeReaddir(dir) {
  try { return await readdir(dir); } catch { return []; }
}

async function main() {
  const years = JSON.parse(await readFile(join(ROOT, 'data', 'years.json'), 'utf8'));
  const files = (await safeReaddir(COLLECTIONS_DIR)).filter((f) => f.endsWith('.txt'));

  // ---- questions: count only approved, per book -------------------------
  const questionCounts = {};
  const demoBooks = new Set();
  const allQuestions = [];
  for (const f of (await safeReaddir(QUESTIONS_DIR)).filter((f) => f.endsWith('.json'))) {
    const qs = JSON.parse(await readFile(join(QUESTIONS_DIR, f), 'utf8'));
    for (const q of qs) {
      if (!q.source || (!q.source.page && !q.source.section)) {
        throw new Error(`${f}: question ${q.id} has no source reference (RULES R1.3)`);
      }
      questionCounts[q.bookId] = (questionCounts[q.bookId] ?? 0) + 1;
      if (q.origin === 'demo-unverified') demoBooks.add(q.bookId);
      allQuestions.push(q);
    }
  }
  await mkdir(join(ROOT, 'public'), { recursive: true });
  await writeFile(join(ROOT, 'public', 'questions.json'), JSON.stringify(allQuestions), 'utf8');

  // ---- books ------------------------------------------------------------
  const books = [];
  const importedCollections = new Set();

  for (const file of files) {
    const collectionId = file.replace(/\.txt$/, '');
    const kind = collectionId.endsWith('-sharh') ? 'sharh' : 'matn';
    const yearId = collectionId.replace(/-(matn|sharh)$/, '');
    const year = years.find((y) => y.id === yearId);
    if (!year) {
      console.warn(`WARN  ${file}: no year "${yearId}" in years.json — skipped`);
      continue;
    }
    importedCollections.add(collectionId);

    for (const line of await readLines(join(COLLECTIONS_DIR, file))) {
      const [slug, en, ur, author, pdfUrl] = line.split('|').map((s) => s.trim());
      if (!slug || !en) continue;

      // A slug can appear in several collections (shared books). Scope the id.
      const id = `${collectionId}:${slug}`;
      books.push({
        id,
        slug,
        collection: collectionId,
        year: yearId,
        stream: year.stream,
        kind,
        title: { en, ur: ur && ur !== '-' ? ur : undefined, ar: undefined },
        author: author && author !== '-' ? author : undefined,
        sourceUrl: `https://darsenizami.net/books/book/${slug}/`,
        pdfUrl: pdfUrl && pdfUrl !== '-' ? pdfUrl : undefined,
        language: guessLanguage(kind, en, ur),
        questionCount: questionCounts[id] ?? 0,
        hasDemoQuestions: demoBooks.has(id),
      });
    }
  }

  // ---- years ------------------------------------------------------------
  const yearsOut = years.map((y) => {
    const matnId = `${y.id}-matn`;
    const sharhId = `${y.id}-sharh`;
    const mine = books.filter((b) => b.year === y.id);
    return {
      ...y,
      collections: { matn: matnId, sharh: sharhId },
      // Honest reporting: which collections have actually been imported.
      imported: {
        matn: importedCollections.has(matnId),
        sharh: importedCollections.has(sharhId),
      },
      bookCount: mine.length,
      questionCount: mine.reduce((n, b) => n + b.questionCount, 0),
    };
  });

  // No build timestamp: the output must be byte-identical for identical
  // input, so CI can assert the committed catalogue is up to date.
  const catalogue = {
    source: 'https://darsenizami.net/books/darja/',
    streams: STREAMS.map((s) => ({ ...s, years: yearsOut.filter((y) => y.stream === s.id).map((y) => y.id) })),
    years: yearsOut,
    books,
    stats: {
      collectionsImported: importedCollections.size,
      collectionsTotal: years.length * 2,
      books: books.length,
      questions: Object.values(questionCounts).reduce((a, b) => a + b, 0),
    },
  };

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(catalogue, null, 2), 'utf8');

  const s = catalogue.stats;
  console.log(`catalogue.json written`);
  console.log(`  collections  ${s.collectionsImported} / ${s.collectionsTotal} imported`);
  console.log(`  books        ${s.books}`);
  console.log(`  questions    ${s.questions}`);
  if (s.collectionsImported < s.collectionsTotal) {
    console.log(`\n  ${s.collectionsTotal - s.collectionsImported} collections not yet imported.`);
    console.log(`  Run: npm run scrape`);
  }
}

main();
