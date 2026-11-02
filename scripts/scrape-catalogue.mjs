#!/usr/bin/env node
/**
 * Scrape the Dars-e-Nizami collection pages from darsenizami.net into
 * data/collections/<collection>.txt
 *
 * Polite by design (RULES R6.1): serial requests, identifies itself, caches,
 * and skips collections already on disk unless --force is passed.
 *
 *   node scripts/scrape-catalogue.mjs            # fill missing collections
 *   node scripts/scrape-catalogue.mjs --force    # re-fetch everything
 *   node scripts/scrape-catalogue.mjs aula-1-matn sania-2-sharh
 *
 * Output format, one book per line:
 *   SLUG | EN TITLE | UR TITLE | AUTHOR | PDF_URL
 */

import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'data', 'collections');
const BASE = 'https://darsenizami.net/books/darja';
const UA = 'nisab-catalogue-bot/0.1 (+https://github.com/; contact via darsenizami.net)';
const DELAY_MS = 1500;

const YEAR_IDS = [
  'aula-1', 'sania-2', 'salesa-3', 'rabia-4', 'khamesa-5', 'sadesa-6', 'sabaa', 'dora',
  'khasa-1', 'khasa-2', 'aliyah-1', 'aliyah-2', 'alamiyah-1', 'alamiyah-2',
];

const ALL_COLLECTIONS = YEAR_IDS.flatMap((y) => [`${y}-matn`, `${y}-sharh`]);

/** Source-site artefacts that are not real books (MEMORY F6). */
const MALFORMED = /^D\s*ownload\b/i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function decode(s) {
  return s
    .replace(/&#8217;|&rsquo;/g, "'")
    .replace(/&#8216;|&lsquo;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Each book on a collection page renders as a card containing a link to
 * /books/book/<slug>/ and a Download link to the PDF. We slice the HTML on
 * the book-link boundary and read each slice.
 */
function parseCollection(html) {
  const books = [];
  const seen = new Set();

  const cardRe = /<h3[^>]*>\s*<a[^>]+href="[^"]*\/books\/book\/([^/"]+)\/"[^>]*>([\s\S]*?)<\/a>\s*<\/h3>([\s\S]*?)(?=<h3|<footer|$)/gi;

  let m;
  while ((m = cardRe.exec(html)) !== null) {
    const slug = m[1];
    const enTitle = decode(m[2]);
    const tail = m[3];

    if (seen.has(slug)) continue;
    seen.add(slug);

    // Urdu title: first RTL-script run in the card tail.
    const urMatch = tail.match(/>\s*([^<>]*[؀-ۿ][^<>]*)\s*</);
    const urTitle = urMatch ? decode(urMatch[1]) : '-';

    const authorMatch = tail.match(/✍️\s*([^<]+)</);
    const author = authorMatch ? decode(authorMatch[1]) : '-';

    const pdfMatch = tail.match(/href="(https?:\/\/[^"]*?\.pdf[^"]*)"/i)
      || tail.match(/href="(https?:\/\/(?:archive\.org|[^"]*mediafire[^"]*)\/[^"]+)"/i);
    const pdfUrl = pdfMatch ? pdfMatch[1] : '-';

    const flagged = MALFORMED.test(enTitle) || !enTitle;
    books.push({ slug, enTitle, urTitle, author, pdfUrl, flagged });
  }

  return books;
}

function serialise(collection, books) {
  const kept = books.filter((b) => !b.flagged);
  const flagged = books.filter((b) => b.flagged);

  const lines = [
    `# ${collection} | scraped ${new Date().toISOString().slice(0, 10)} | ${kept.length} entries`,
    '# SLUG | EN TITLE | UR TITLE | AUTHOR | PDF_URL',
    ...kept.map((b) => `${b.slug} | ${b.enTitle} | ${b.urTitle} | ${b.author} | ${b.pdfUrl}`),
  ];

  if (flagged.length) {
    lines.push('# FLAGGED — malformed entries on the source site; excluded from the catalogue');
    lines.push(...flagged.map((b) => `# ${b.slug} | ${b.enTitle} | ${b.urTitle} | ${b.author} | ${b.pdfUrl}`));
  }

  return lines.join('\n') + '\n';
}

async function exists(p) {
  try { await access(p); return true; } catch { return false; }
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const named = args.filter((a) => !a.startsWith('--'));
  const targets = named.length ? named : ALL_COLLECTIONS;

  await mkdir(OUT_DIR, { recursive: true });

  let fetched = 0, skipped = 0, failed = 0;

  for (const collection of targets) {
    const outPath = join(OUT_DIR, `${collection}.txt`);

    if (!force && (await exists(outPath))) {
      console.log(`skip    ${collection} (already on disk; --force to refetch)`);
      skipped++;
      continue;
    }

    try {
      // Collection pages paginate at 48 entries: "114 books • page 1/3", with
      // page 2 at /<collection>/page/2/. Reading only page 1 silently loses
      // most of the large sharh collections.
      const books = [];
      const seenSlugs = new Set();
      let page = 1;
      let totalPages = 1;

      for (;;) {
        const url = page === 1 ? `${BASE}/${collection}/` : `${BASE}/${collection}/page/${page}/`;
        const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'text/html' } });
        if (!res.ok) throw new Error(`HTTP ${res.status} on page ${page}`);
        const html = await res.text();

        if (page === 1) {
          const m = html.match(/page\s*(\d+)\s*\/\s*(\d+)/i);
          if (m) totalPages = Number(m[2]);
        }

        let added = 0;
        for (const b of parseCollection(html)) {
          if (seenSlugs.has(b.slug)) continue;
          seenSlugs.add(b.slug);
          books.push(b);
          added++;
        }

        if (page >= totalPages || added === 0 || page >= 20) break;
        page++;
        await sleep(DELAY_MS);
      }

      if (books.length === 0) {
        console.warn(`WARN    ${collection}: parsed 0 books — page markup may have changed`);
        failed++;
      } else {
        await writeFile(outPath, serialise(collection, books), 'utf8');
        const bad = books.filter((b) => b.flagged).length;
        console.log(
          `ok      ${collection}: ${books.length - bad} books` +
          `${bad ? ` (${bad} flagged)` : ''}${page > 1 ? ` across ${page} pages` : ''}`,
        );
        fetched++;
      }
    } catch (err) {
      console.error(`FAIL    ${collection}: ${err.message}`);
      failed++;
    }

    await sleep(DELAY_MS); // be kind to the source site
  }

  console.log(`\nfetched ${fetched}, skipped ${skipped}, failed ${failed}`);
  if (failed) process.exitCode = 1;
}

main();
