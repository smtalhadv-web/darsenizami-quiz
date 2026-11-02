# TASKS — Nisab

**Date:** 2026-11-02
Phases are sequential. A phase is not done until its exit criteria are met.

Legend: `[ ]` todo · `[~]` in progress · `[x]` done · `[!]` blocked

---

## Phase 0 — Foundation

- [x] 0.1 Study darsenizami.net structure; confirm 14 year-levels, matn/sharh split
- [x] 0.2 Establish that book PDFs are archive.org-hosted scans
- [x] 0.3 Establish that the site reader exposes no book text
- [x] 0.4 Write the six docs files
- [ ] 0.5 Owner approves PRD, ARCHITECTURE, RULES, DESIGN
- [ ] 0.6 Create GitHub repo; first commit; branch protection on `main`
- [ ] 0.7 Scaffold Vite + React + TypeScript; lint; Vitest
- [ ] 0.8 CI: lint + test on push
- [ ] 0.9 CD: build → GitHub Pages; verify live URL

**Exit:** empty app live on Pages, CI green, docs approved.

## Phase 1 — Catalogue

- [ ] 1.1 `scripts/scrape-catalogue.mjs` — 28 collection pages, polite, cached
- [ ] 1.2 Parse title (en/ur), author, book URL, archive.org PDF URL
- [ ] 1.3 Classify each book `language: ar | ur` (drives OCR priority later)
- [ ] 1.4 Emit `data/catalogue.json`; schema-validate in CI
- [ ] 1.5 Manual spot-check of 20 books against the live site
- [ ] 1.6 `catalogue/` module: load, query by stream/year/collection
- [ ] 1.7 Unit tests for catalogue queries

**Exit:** real data for all 14 years and ~1,080 books, verified by sampling.

## Phase 2 — Session engine (TDD — tests first)

- [ ] 2.1 Types: `Question`, `SessionConfig`, `SessionState`, events
- [ ] 2.2 **Failing tests** for practice: immediate feedback, revisit allowed, no timer
- [ ] 2.3 **Failing tests** for strict: linear only, PREV rejected, auto-submit on expiry
- [ ] 2.4 **Failing tests** for board: flag/unflag, free navigation, no feedback pre-submit
- [ ] 2.5 **Failing tests** for scoring, pass mark, unanswered handling
- [ ] 2.6 Implement engine until green
- [ ] 2.7 Property test: no mode leaks correctness before submit except practice
- [ ] 2.8 Regression test: removing the strict-mode back-guard fails a test

**Exit:** engine fully tested, no React imported anywhere in `session/`.

## Phase 3 — i18n shell

- [ ] 3.1 `i18n/` with ar, ur, en; direction per locale
- [ ] 3.2 `<html dir>` and font switching
- [ ] 3.3 Load Noto Naskh Arabic, Noto Nastaliq Urdu, Inter; subset for weight
- [ ] 3.4 Design tokens from DESIGN.md §2; light and dark
- [ ] 3.5 Logical-property CSS base; lint rule banning `margin-left`/`right`
- [ ] 3.6 Locale persisted to device

**Exit:** language toggle works; no hardcoded strings; RTL verified.

## Phase 4 — Student app

- [ ] 4.1 Home: streams, 14 year cards, real book + question counts
- [ ] 4.2 Year: matn/sharh tabs, book list, honest empty states
- [ ] 4.3 Book: three mode cards, pass mark, prior attempts
- [ ] 4.4 Question screen: stem, quoted matn block, options, progress, timer
- [ ] 4.5 Practice feedback: correct/incorrect + icon + word, explanation, source
- [ ] 4.6 Strict mode: no back affordance rendered at all
- [ ] 4.7 Board mode: flag, review grid, unanswered warning before submit
- [ ] 4.8 Result sheet: score, pass/fail, full per-question review with sources
- [ ] 4.9 `progress/` localStorage, try/catch wrapped, version key
- [ ] 4.10 PWA: manifest, service worker, offline shell, installable
- [ ] 4.11 Accessibility pass: contrast, keyboard, screen reader, 200% zoom
- [ ] 4.12 Verify every screen in all three locales

**Exit:** complete runs in all three modes, on an Android phone, installed.

## Phase 5 — Seed questions (hand-authored, verified)

- [ ] 5.1 Decide exact seed books in Al-Aula and Banat Khasa 1
- [ ] 5.2 Source book text for those titles — **blocked: archive.org unreachable from the build sandbox; owner to supply text or run fetch via Actions**
- [ ] 5.3 Author ~20 questions per seed book, each with page reference
- [ ] 5.4 Owner/ustadh verifies every question against the book
- [ ] 5.5 Load as `approved` with `origin: 'authored'`
- [ ] 5.6 Regenerate `questionCount` at build

**Exit:** two year-levels have real, verified, source-referenced questions.

## Phase 6 — Prototype review

- [ ] 6.1 Deploy; share Pages URL
- [ ] 6.2 Owner approves theme and flow — **gate for phase 7**
- [ ] 6.3 Record changes requested in MEMORY.md
- [ ] 6.4 Apply changes

**Exit:** theme signed off. Backend may begin.

---

## Phase 7 — Question store (backend)

- [ ] 7.1 Supabase project; `questions` schema per ARCHITECTURE §4
- [ ] 7.2 RLS: anon reads `approved` only
- [ ] 7.3 Constraint: approved requires a source reference
- [ ] 7.4 **Test that an anon key cannot read a draft** — the critical test
- [ ] 7.5 Migrate seed questions from static to Supabase
- [ ] 7.6 Client fetch + cache; offline fallback to last synced set

## Phase 8 — Ingestion pipeline

Revised 2026-11-02 after measuring OCR accuracy (MEMORY F8, F9; ARCH §5.1).
Tesseract-for-Urdu is removed from the plan; it was measured at CER 1.41.

- [ ] 8.1 Stage 1 fetch: download PDF, checksum, store pages
- [ ] 8.2 Stage 2 classify: text layer? scanned? script?
- [ ] 8.3 Stage 3 layout via **MinerU** — regions, reading order, matn vs hashiya
- [ ] 8.4 **Evaluate MinerU on 5 real scanned pages** — can it separate matn from
      hashiya on a madrasa edition? Blocked in the sandbox (MEMORY F7); must run
      on Actions or the owner's machine
- [ ] 8.5 Stage 4a Arabic recognition: Tesseract `ara` + preprocessing
      (deskew, binarise, denoise); target CER < 0.25 on real scans
- [ ] 8.6 **Measure Arabic CER on 5 real scans.** Clean-text CER was 0.140;
      real scans will be worse. Go/no-go threshold to be set before measuring,
      not after
- [x] 8.7 Stage 4b Urdu recognition via Gemini — built, UNTESTED (D18)
- [ ] 8.7a Confirm the owner has an AI Studio **API key**, not just the app
      subscription — they are different things
- [ ] 8.7b Add GEMINI_API_KEY as an Actions secret
- [ ] 8.7c Run `OCR trial (Urdu via Gemini)` on 5 real pages of an Urdu sharh
- [ ] 8.7d Read the output against the printed page and record real CER —
      the free tier serves 3.x Flash, not the 2.5-Pro that scored 0.125
- [ ] 8.8 Stage 5 segment into passages with page numbers
- [ ] 8.9 Stage 6 draft via template extraction (ARCH §5.3 option 1)
- [ ] 8.10 Stage 7 queue as `draft` with confidence + ocr_language
- [ ] 8.11 Actions workflow, resumable stages, artefacts retained

## Phase 9 — Admin and review

- [ ] 9.1 Admin auth (Supabase, owner + reviewers)
- [ ] 9.2 Add book by archive.org URL or PDF upload
- [ ] 9.3 Trigger ingestion from admin; show stage progress
- [ ] 9.4 Review screen: draft beside source page image
- [ ] 9.5 Approve / edit-and-approve / reject with reason — **no bulk control**
- [ ] 9.6 Show confidence and OCR language before any action
- [ ] 9.7 Reviewer throughput and accept-rate stats, to evaluate the extractor

## Phase 10 — Scale out

- [ ] 10.1 Ingest remaining Arabic mutun, year by year
- [ ] 10.2 Review backlog with ustadh
- [ ] 10.3 Re-evaluate Urdu sharh feasibility from phase 8 data
- [ ] 10.4 Publish coverage page — honest per-year question counts

---

## Blocked / needs a decision

| # | Item | Needs |
|---|---|---|
| B1 | archive.org unreachable from the build sandbox | Fetching happens in Actions, or owner supplies text |
| B2 | ~~Urdu nastaliq OCR viability unproven~~ **RESOLVED: Tesseract measured at CER 1.41, unusable** | Urdu now needs a VLM — see B7 |
| B3 | Drafting method | Template extraction first; revisit with review data |
| B4 | Pass mark — uniform or per book? | Owner |
| B5 | Who else gets reviewer access? | Owner |
| B6 | Result sheet shareable to WhatsApp? | Owner |
| B7 | Urdu VLM vs zero-cost conflict (MEMORY D17) | Owner |
| B8 | MinerU layout quality on real madrasa scans | Must run outside the sandbox |
