#!/usr/bin/env node
/**
 * Stage 4b — Urdu Nastaliq recognition via a vision-language model.
 *
 * Why this exists: Tesseract measured CER 1.411 on Nastaliq (MEMORY F8) —
 * noise, not degraded text. Only VLMs reach usable accuracy (F9).
 *
 * SECURITY (RULES R4.5): the key is read from GEMINI_API_KEY in the
 * environment. It is never committed, never logged, and never reaches the
 * client bundle. In CI it comes from an Actions secret.
 *
 * INTEGRITY: a VLM asked to read a page can silently "correct" it to what it
 * expects the text to say. On fiqh and aqidah that is the worst possible
 * failure mode — a fluent, plausible, wrong transcription. Two defences here:
 *
 *   1. temperature 0 and a prompt that forbids correction, completion,
 *      vowelling, or commentary.
 *   2. --passes=2 transcribes each page twice in independent requests and
 *      reports the disagreement rate. Pages where the model disagrees with
 *      itself are where it is improvising. High divergence => do not trust
 *      the page, regardless of how clean the output looks.
 *
 * Output is always state='draft'. Nothing here reaches a student (RULES R1.1).
 *
 * Usage:
 *   GEMINI_API_KEY=... node scripts/ingest/ocr-gemini.mjs \
 *     --in pages/ --out ocr/ --lang ur [--model gemini-flash-latest]
 *     [--passes 2] [--limit 10] [--rpm 10]
 */

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, basename, extname } from 'node:path';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// Free-tier model. 2.5-pro scored best in the LREC 2026 benchmark but is not
// available on the free tier for new projects, so it is not the default.
const DEFAULT_MODEL = process.env.GEMINI_MODEL ?? 'gemini-flash-latest';

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };

const PROMPT_UR = `You are transcribing a scanned page from a printed Urdu book in Nastaliq script.

Transcribe EXACTLY what is printed on the page. Rules:
- Reproduce the text character for character as printed.
- Do NOT correct spelling, grammar, or anything you believe is a misprint.
- Do NOT add vowel marks (aeraab) that are not printed.
- Do NOT complete, summarise, paraphrase, modernise or explain anything.
- Do NOT add commentary, headings, notes, or translation.
- If a word or region is illegible, output exactly [[ILLEGIBLE]] in its place.
  Guessing is a failure. [[ILLEGIBLE]] is the correct answer when unsure.
- Preserve line breaks as they appear.
- If the page has distinct regions (main text, marginal notes, footnotes),
  separate them with a line containing only ---REGION---

Output only the transcription. No preamble.`;

const PROMPT_AR = PROMPT_UR
  .replace('printed Urdu book in Nastaliq script', 'printed Arabic book in Naskh script')
  .replace('(aeraab)', '(harakat)');

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  if (i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')) {
    return process.argv[i + 1];
  }
  return process.argv.includes(`--${name}`) ? true : fallback;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Normalised Levenshtein distance, for comparing two transcription passes. */
function cer(a, b) {
  const s = [...a.replace(/\s+/g, ' ').trim()];
  const t = [...b.replace(/\s+/g, ' ').trim()];
  if (!s.length && !t.length) return 0;
  if (!s.length || !t.length) return 1;
  let prev = Array.from({ length: t.length + 1 }, (_, i) => i);
  for (let i = 1; i <= s.length; i++) {
    const cur = [i];
    for (let j = 1; j <= t.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (s[i - 1] === t[j - 1] ? 0 : 1),
      );
    }
    prev = cur;
  }
  return prev[t.length] / Math.max(s.length, t.length);
}

async function transcribe(imgB64, mime, prompt, model, key) {
  const body = {
    contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mime, data: imgB64 } }] }],
    generationConfig: { temperature: 0, topP: 1, maxOutputTokens: 8192 },
  };

  // Retry on rate limit and transient server errors, with backoff.
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(`${API_BASE}/${model}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const json = await res.json();
      const text = json?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
      const finish = json?.candidates?.[0]?.finishReason;
      if (finish && finish !== 'STOP') {
        return { text, warning: `finishReason=${finish}` };
      }
      return { text };
    }

    if (res.status === 429 || res.status >= 500) {
      const wait = 2 ** attempt * 2000;
      console.warn(`  rate limited / server error (${res.status}), waiting ${wait / 1000}s`);
      await sleep(wait);
      continue;
    }

    // Never print the body of an auth error verbatim — it can echo the key.
    throw new Error(
      res.status === 400 || res.status === 403
        ? `HTTP ${res.status} — check GEMINI_API_KEY is a valid AI Studio key and the model "${model}" is available to it`
        : `HTTP ${res.status}`,
    );
  }
  throw new Error('exhausted retries');
}

async function main() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.error(
      'GEMINI_API_KEY is not set.\n\n' +
      'Get a key at https://aistudio.google.com/apikey (free tier, no card).\n' +
      'A Gemini app / Google One AI Premium subscription is NOT an API key.\n\n' +
      'Local:  export GEMINI_API_KEY=...   (do not commit it)\n' +
      'CI:     repo Settings > Secrets and variables > Actions',
    );
    process.exit(2);
  }

  const inDir = arg('in', 'pages');
  const outDir = arg('out', 'ocr');
  const lang = arg('lang', 'ur');
  const model = arg('model', DEFAULT_MODEL);
  const passes = Number(arg('passes', 2));
  const limit = Number(arg('limit', 0));
  const rpm = Number(arg('rpm', 10));
  const gap = Math.ceil(60000 / rpm);

  const prompt = lang === 'ar' ? PROMPT_AR : PROMPT_UR;

  await mkdir(outDir, { recursive: true });
  let files = (await readdir(inDir)).filter((f) => MIME[extname(f).toLowerCase()]).sort();
  if (limit > 0) files = files.slice(0, limit);

  if (!files.length) {
    console.error(`No images in ${inDir}/`);
    process.exit(1);
  }

  console.log(`model ${model} · lang ${lang} · ${files.length} pages · ${passes} pass(es) · ${rpm} rpm\n`);

  const report = [];

  for (const file of files) {
    const buf = await readFile(join(inDir, file));
    const b64 = buf.toString('base64');
    const mime = MIME[extname(file).toLowerCase()];
    process.stdout.write(`${file} `);

    const runs = [];
    try {
      for (let p = 0; p < passes; p++) {
        const { text, warning } = await transcribe(b64, mime, prompt, model, key);
        runs.push(text);
        if (warning) console.warn(`\n  warning: ${warning}`);
        process.stdout.write('.');
        await sleep(gap);
      }
    } catch (err) {
      console.log(` FAILED: ${err.message}`);
      report.push({ file, error: err.message });
      continue;
    }

    const divergence = passes > 1 ? cer(runs[0], runs[1]) : null;
    const illegible = (runs[0].match(/\[\[ILLEGIBLE\]\]/g) ?? []).length;

    // Self-disagreement is the hallucination signal. A model that transcribes
    // the same image two different ways is improvising on at least one.
    const confidence =
      divergence === null ? null
      : divergence < 0.02 ? 'high'
      : divergence < 0.10 ? 'medium'
      : 'low';

    const out = {
      file,
      model,
      lang,
      transcribedAt: new Date().toISOString(),
      passes,
      selfDivergence: divergence,
      confidence,
      illegibleMarkers: illegible,
      text: runs[0],
      altText: runs[1] ?? null,
      state: 'draft', // never anything else from this script (RULES R1.1)
    };

    await writeFile(join(outDir, `${basename(file, extname(file))}.json`), JSON.stringify(out, null, 2));
    console.log(
      ` ${confidence ?? 'n/a'}${divergence !== null ? ` (div ${divergence.toFixed(3)})` : ''}` +
      `${illegible ? ` · ${illegible} illegible` : ''}`,
    );
    report.push({ file, divergence, confidence, illegible });
  }

  const ok = report.filter((r) => !r.error);
  const low = ok.filter((r) => r.confidence === 'low').length;
  const mean = ok.length ? ok.reduce((a, r) => a + (r.divergence ?? 0), 0) / ok.length : 0;

  console.log(`\n${'='.repeat(56)}`);
  console.log(`pages      ${ok.length} ok, ${report.length - ok.length} failed`);
  console.log(`divergence mean ${mean.toFixed(3)}`);
  console.log(`low conf   ${low} page(s)`);
  console.log(`${'='.repeat(56)}`);
  console.log(
    '\nAll output is state=draft. Nothing here is publishable until a human\n' +
    'has read it against the book (RULES R1.1, R1.2).',
  );
  if (low > 0) {
    console.log(`\n${low} page(s) diverged between passes — the model is improvising there.`);
    console.log('Review those first, or re-scan them at higher resolution.');
  }

  await writeFile(join(outDir, '_report.json'), JSON.stringify(report, null, 2));
}

main().catch((e) => { console.error(e.message); process.exit(1); });
