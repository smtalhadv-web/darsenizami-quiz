# Nisab — Dars-e-Nizami practice & examination

A practice and examination app for Dars-e-Nizami students, built on the book
catalogue at [darsenizami.net](https://darsenizami.net/books/darja/).

Students pick their year and book, drill multiple-choice questions, and sit
timed papers. **No question reaches a student until a human has approved it
against the book** — see `docs/PRD.md` §3.

> **Prototype status.** The 12 questions currently shipped are labelled
> `demo-unverified`. They exist to demonstrate the engine and have **not** been
> checked against any printed text. They carry no page references and the app
> says so on every screen that shows them. Do not study from them.

## Read first

| Document | What it covers |
|---|---|
| [`docs/PRD.md`](docs/PRD.md) | What this is, who it's for, the integrity constraint |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | The four subsystems and why each is shaped that way |
| [`docs/RULES.md`](docs/RULES.md) | Binding rules — content integrity, code, i18n |
| [`docs/DESIGN.md`](docs/DESIGN.md) | Visual language and screen designs |
| [`docs/TASKS.md`](docs/TASKS.md) | Phased plan and what's blocked |
| [`docs/MEMORY.md`](docs/MEMORY.md) | Decisions made, findings, dead ends |

## Quick start

```bash
npm install
node scripts/build-catalogue.mjs   # generate public/catalogue.json + questions.json
npm test                           # 48 tests
npm run dev
```

## What works now

- All **14 year-levels** (8 Banin, 6 Banat), real names in Arabic, Urdu, English
- Real book data for 3 of 28 collections (66 books); the rest fill via the scraper
- **Three study modes**, one pure state machine:
  - Practice — untimed, immediate feedback
  - Examination (Strict) — timed, linear, no going back, auto-submit
  - Examination (Board) — timed, flag and return, review grid before submit
- Trilingual UI with correct RTL, Nastaliq for Urdu and Naskh for Arabic
- Device-local progress, no accounts
- Installable PWA, offline after first load

## Filling the rest of the catalogue

Only 3 of 28 collections ship with data, because the sandbox this was built in
cannot reach darsenizami.net directly. The scraper fills the rest:

```bash
npm run scrape                     # fetch the 25 missing collections
node scripts/build-catalogue.mjs   # regenerate
```

Or run the **Scrape catalogue** workflow on GitHub Actions, which opens a PR
with the diff. The scraper is polite by design: serial requests, 1.5s apart,
identifies itself, skips what's already on disk.

## Layout

```
data/
  years.json              14 year-levels, hand-maintained
  collections/*.txt       one file per collection, pipe-delimited
  questions/*.json        question sets
scripts/
  scrape-catalogue.mjs    darsenizami.net -> data/collections/
  build-catalogue.mjs     data/ -> public/catalogue.json + questions.json
src/
  session/                pure quiz engine — no React, no I/O
  catalogue/              catalogue queries + build-time integrity tests
  progress/               device-local storage
  i18n/                   ar | ur | en
  ui/                     screens
```

The split that matters: `src/session/` is a pure state machine with no React
import anywhere. The three modes differ only by configuration, so they are
unit-testable without rendering — which is where mode bugs would otherwise hide.

## Deployment

Push to `main`. CI runs typecheck and tests; a separate workflow builds and
deploys to GitHub Pages. `BASE_PATH` is derived from the repo name.

To publish:

```bash
gh repo create <name> --public --source=. --push
# then: Settings -> Pages -> Source: GitHub Actions
```

## Not built yet

Phases 7–10 in `docs/TASKS.md`: Supabase question store with RLS, the OCR
ingestion pipeline on Actions, and the reviewer interface. The ingestion design
is in `docs/ARCHITECTURE.md` §5 — note that Urdu nastaliq OCR viability is an
open measurement (TASKS 8.4), not an assumption.

## Licence and sources

Book metadata comes from darsenizami.net; the books themselves belong to their
authors and publishers and are not redistributed here. The app stores derived
questions and short cited excerpts only.
