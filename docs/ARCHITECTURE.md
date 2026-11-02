# ARCHITECTURE — Nisab

**Date:** 2026-11-02
**Status:** Draft for approval

---

## 1. Shape of the system

Four subsystems, deliberately separable. Each can be understood, built and tested
without the others.

```
┌──────────────────────────────────────────────────────────────┐
│  1. CATALOGUE        books, years, streams, matn/sharh        │
│     source: darsenizami.net  →  static JSON in repo           │
└───────────────────────────┬──────────────────────────────────┘
                            │ read
┌───────────────────────────▼──────────────────────────────────┐
│  2. STUDENT PWA      React + Vite, GitHub Pages               │
│     practice · strict exam · board exam · i18n · local prog.  │
└───────────────────────────┬──────────────────────────────────┘
                            │ reads ONLY approved questions
┌───────────────────────────▼──────────────────────────────────┐
│  3. QUESTION STORE   Supabase (Postgres + RLS)                │
│     draft → in_review → approved → rejected                   │
└───────────────────────────▲──────────────────────────────────┘
                            │ writes drafts
┌───────────────────────────┴──────────────────────────────────┐
│  4. INGESTION        GitHub Actions workflow                  │
│     fetch PDF → OCR → segment → draft MCQs → queue            │
└──────────────────────────────────────────────────────────────┘
```

**Why ingestion is a GitHub Action and not a server:** it needs network access to
archive.org, meaningful CPU for OCR, and it runs rarely and in bursts. Actions
gives all three free. A long-running server would cost money and sit idle.

**Why the catalogue is static JSON and not a database table:** it changes when
darsenizami.net changes, which is rarely; it is read on every page load; and
shipping it with the build means the app's navigation works offline and with
Supabase down.

## 2. Subsystem 1 — Catalogue

**Purpose:** know every book, which year it belongs to, and whether it is matn or
sharh.

**Source of truth:** darsenizami.net. 14 collection pages × 2 (matn/sharh) = 28
index pages, each listing books with English title, Urdu title, optional author,
a book detail URL, and an archive.org download URL.

**Shape:**

```jsonc
// data/catalogue.json
{
  "streams": [
    { "id": "banin", "name": { "en": "Banin", "ur": "بنین", "ar": "بنين" },
      "years": ["aula-1", "sania-2", "salesa-3", "rabia-4",
                "khamesa-5", "sadesa-6", "sabaa-7", "dora-8"] },
    { "id": "banat", "name": { "en": "Banat", "ur": "بنات", "ar": "بنات" },
      "years": ["khasa-1", "khasa-2", "aliyah-1",
                "aliyah-2", "alamiyah-1", "alamiyah-2"] }
  ],
  "years": [
    { "id": "aula-1", "stream": "banin", "ordinal": 1,
      "name": { "en": "Al-Aula (1st Year)", "ur": "درجہ اولی", "ar": "الأولى" },
      "collections": { "matn": "aula-1-matn", "sharh": "aula-1-sharh" } }
  ],
  "books": [
    { "id": "dn-sarf-e-meer", "collection": "aula-1-matn",
      "year": "aula-1", "stream": "banin", "kind": "matn",
      "title": { "en": "Sarf e Meer", "ur": "صرف میر", "ar": "صرف مير" },
      "author": null,
      "sourceUrl": "https://darsenizami.net/books/book/dn-sarf-e-meer/",
      "pdfUrl": "https://archive.org/download/.../SarfEMeerAlBushraColor.pdf",
      "language": "ar",
      "questionCount": 0 }
  ]
}
```

`questionCount` is regenerated at build time from the approved question set, so
the app can honestly say "no questions yet" without a network call.

**Builder:** `scripts/scrape-catalogue.mjs`, run manually or on a schedule,
commits the regenerated JSON. Polite: one request at a time, identifies itself,
caches.

## 3. Subsystem 2 — Student PWA

**Stack:** React 18 + TypeScript + Vite. Routed with hash or base-path routing
suited to GitHub Pages project sites. No UI framework dependency that fights RTL.

**Module boundaries:**

```
src/
  catalogue/      load + query catalogue.json           (pure, no UI)
  questions/      fetch approved questions, cache       (no UI)
  session/        quiz engine: state machine for a run  (pure, no UI, no React)
  progress/       device-local persistence              (no UI)
  i18n/           ar | ur | en strings, direction       (no UI)
  ui/             screens and components                (no business logic)
```

The rule that matters: **`session/` contains no React and no I/O.** The quiz
engine is a pure state machine. Given a question set and a mode, it produces the
sequence of states a run passes through. That makes the three modes testable
without rendering anything, which is the part most likely to harbour bugs.

### 3.1 The session state machine

One engine, three configurations — not three implementations.

```ts
type Mode = 'practice' | 'exam-strict' | 'exam-board';

interface SessionConfig {
  mode: Mode;
  questions: Question[];
  timeLimitSec: number | null;   // null in practice
  allowRevisit: boolean;         // false strict, true board, true practice
  feedback: 'immediate' | 'on-submit';
  passMark: number;              // 0..1
}
```

| | practice | exam-strict | exam-board |
|---|---|---|---|
| timeLimitSec | null | set | set |
| allowRevisit | true | **false** | true |
| feedback | immediate | on-submit | on-submit |

Adding a future mode means adding a config, not a code path.

Events in: `ANSWER`, `NEXT`, `PREV`, `FLAG`, `TICK`, `SUBMIT`.
State out: current index, answers, flags, remaining time, phase
(`active` | `submitted`), and a result once submitted.

### 3.2 Internationalisation

Three locales: `ar`, `ur`, `en`. `ar` and `ur` are RTL, `en` is LTR.

- Direction is set on `<html dir>`, driven by locale, never hardcoded per
  component.
- Layout uses logical CSS properties (`margin-inline-start`, not `margin-left`)
  throughout, so one stylesheet serves both directions.
- Urdu renders in a Nastaliq face (Noto Nastaliq Urdu); Arabic in a naskh face
  (Noto Naskh Arabic). These are visually different scripts and sharing a font
  between them looks wrong to a native reader.
- **Question content language is independent of UI language.** An Arabic matn
  question stays in Arabic when the UI is English. Only chrome and explanations
  follow the UI locale.

### 3.3 Progress

`localStorage`, one versioned key, wrapped in try/catch because private browsing
and cleared site data both make it throw or return empty.

```jsonc
{ "v": 1,
  "attempts": [ { "bookId": "...", "mode": "exam-strict",
                  "score": 0.72, "at": "2026-11-02T10:00:00Z" } ],
  "seen": { "<questionId>": { "correct": true, "at": "..." } },
  "locale": "ur" }
```

Progress is never load-bearing. Losing it degrades the experience; it never
breaks the app.

## 4. Subsystem 3 — Question store

**Supabase Postgres.**

```sql
create type question_state as enum ('draft','in_review','approved','rejected');

create table questions (
  id              uuid primary key default gen_random_uuid(),
  book_id         text not null,
  collection_id   text not null,
  year_id         text not null,
  stream          text not null check (stream in ('banin','banat')),
  kind            text not null check (kind in ('matn','sharh')),

  stem            jsonb not null,      -- { ar?, ur?, en? }
  options         jsonb not null,      -- [{ id, text:{...} }] >= 4
  correct_option  text not null,
  explanation     jsonb not null,

  source_page     int,
  source_section  text,
  source_quote    text,                -- short cited excerpt

  state           question_state not null default 'draft',
  confidence      real,
  ocr_language    text,                -- 'ar' | 'ur' | null if hand-authored
  origin          text not null,       -- 'drafted' | 'authored'

  approved_by     text,
  approved_at     timestamptz,
  review_note     text,

  created_at      timestamptz not null default now()
);

alter table questions enable row level security;

-- the integrity constraint, enforced in the database
create policy students_read_approved on questions
  for select to anon
  using (state = 'approved');
```

That RLS policy is the single most important line in the system. The anonymous
student key is physically incapable of reading an unapproved question, regardless
of any bug in the client.

A question must have a source reference to be approved:

```sql
alter table questions add constraint approved_needs_source
  check (state <> 'approved' or source_page is not null or source_section is not null);
```

## 5. Subsystem 4 — Ingestion

A GitHub Actions workflow, dispatched manually or by an admin action.

```
 input: book id + pdf url
   │
   ├─ 1 fetch      download PDF, checksum, store page images
   ├─ 2 classify   text layer present? scanned? script = ar | ur?
   ├─ 3 ocr        tesseract (ara / urd traineddata); skip if text layer exists
   ├─ 4 segment    split into passages with page numbers
   ├─ 5 draft      passage → candidate MCQs
   └─ 6 queue      insert as state='draft' with confidence + ocr_language
```

Stages write intermediate artefacts, so stage 5 can be re-run without
re-downloading or re-OCRing. Each stage is a separate script with a file-in /
file-out contract, runnable locally.

**Step 5 is the honest part.** Drafting genuine comprehension questions from a
passage needs a language model, and a free model good enough for classical Arabic
grammar is not a given. Options, to be decided before phase 2 begins:

1. **Template extraction** — no model. Pull definitions, enumerations and
   ʿilal from structured passages using patterns (`باب`, `فصل`, numbered lists,
   definition formulae). Narrow, but cheap and predictable.
2. **Local small model** on the Actions runner — free, slow, weak on Arabic.
3. **Hosted model with a free allowance** — better drafts, hits a quota, becomes
   a dependency.

Recommendation: start with (1), because every draft is reviewed anyway and a
predictable narrow extractor wastes less reviewer time than a creative one that
hallucinates. Revisit after the first review round gives real accept/reject data.

## 6. Deployment

```
push to main
  → Action: build PWA  → deploy to GitHub Pages
  → Action: lint + test (blocks deploy on failure)

manual dispatch
  → Action: scrape catalogue → commit data/catalogue.json
  → Action: ingest book     → write drafts to Supabase
```

Only the publishable Supabase anon key reaches the client. The service key lives
in Actions secrets and never enters the bundle.

## 7. Decisions and their reasons

| Decision | Reason | Rejected alternative |
|---|---|---|
| PWA, not native | One codebase for web + mobile, free distribution, no store review | React Native — two build targets, store accounts, cost |
| Catalogue as static JSON | Offline navigation, zero query cost, rarely changes | Catalogue in Postgres — network dependency for every page |
| Pure session engine, no React | The three modes are where bugs hide; make them unit-testable | Logic in hooks — untestable without rendering |
| RLS enforces approval | Client bugs must not be able to leak unreviewed religious content | UI-level filtering — one bad query away from failure |
| Ingestion in Actions | Needs archive.org access + CPU, runs in bursts | Always-on server — costs money, idle most of the time |
| Per-question approval only | Bulk approve is rubber-stamping with extra steps | Bulk approve with spot checks |

## 8. What this architecture does not do

It does not scale to real-time multi-user features, does not support teacher
dashboards, and does not serve the books themselves. Each of those would change
the shape above, and none is in scope.
