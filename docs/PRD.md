# PRD — Nisab: Dars-e-Nizami Practice & Examination

**Status:** Draft for approval
**Date:** 2026-11-02
**Owner:** livevirtue
**Source corpus:** https://darsenizami.net/books/darja/

---

## 1. Problem

Dars-e-Nizami students across Pakistan study a fixed, centuries-old syllabus of
mutun (متون, core texts) and shuroohat (شروحات, commentaries), year by year, from
Al-Aula through Dora-e-Hadith for banin, and Khasa through Alamiyah for banat.

They read the books. They have almost no way to test whether they have retained
them. Revision before a madrasa examination is oral, ad hoc, and depends entirely
on whether an ustadh has time to question them.

darsenizami.net already hosts the full corpus — ~1,080 book entries across 14
year-levels — as free PDFs. The books are there. The practice layer is not.

## 2. What we are building

A practice and examination app where a student selects their year and their book,
and drills multiple-choice questions drawn from that book's actual text — then
sits timed examinations under exam conditions.

Two modes:

- **Practice** — untimed, immediate feedback, explanation and source reference
  shown after each question. For learning.
- **Examination** — timed, feedback withheld until submission, pass mark, result
  sheet. For testing.

## 3. The integrity constraint

This is the requirement that outranks every other requirement in this document.

**No question reaches a student until a human has approved it.**

The corpus includes ʿaqīdah, fiqh, usul and hadith texts. A confidently worded
multiple-choice question that misstates a ruling in Noor ul Izah, or attributes a
position to the wrong imam, is not a cosmetic bug — it is misinformation about
religion delivered to a student who trusts the app because it carries the book's
name.

Therefore:

- Questions may be **drafted** mechanically from book text.
- Every draft enters an **unapproved** state and is invisible to students.
- A reviewer (the owner, or an ustadh granted reviewer access) must read the
  draft against the book and explicitly approve, edit, or reject it.
- Only `approved` questions are ever served to the student app.
- Every published question carries a **source reference** — book, and page or
  section — so a student or teacher can check it against the original.

A question with no verifiable source reference is not publishable.

## 4. Users

| User | Needs |
|---|---|
| **Student** (banin or banat, years 1–8) | Pick my year and book; practice; sit a timed paper; see what I got wrong and why; track what I have covered. |
| **Reviewer** (ustadh) | See drafted questions beside the source text; approve, edit, or reject; never be forced to rubber-stamp. |
| **Admin** (owner) | Add a book by archive.org link or upload; trigger extraction; monitor the review queue; publish question sets. |

## 5. Scope

### 5.1 In scope — prototype (phase 1)

- Full navigation shell for **all 14 year-levels**, banin and banat, with real
  book catalogue data scraped from darsenizami.net (real titles in English and
  Urdu, real matn/sharh split, real book counts).
- Practice mode and both examination presets, fully working.
- A **hand-built, verified seed question set** for two year-levels:
  **Al-Aula (1st year, banin)** and **Banat Khasa Year 1**.
- Trilingual interface: Arabic, Urdu, English, with correct RTL layout.
- Device-local progress. No accounts, no login.
- Installable PWA, works on phone and desktop, works offline once loaded.
- Deployed live on GitHub Pages from the first commit.

Every other year-level is navigable and shows its real books, but reports
honestly that its question sets are not yet published. The app never fabricates
coverage it does not have.

### 5.2 In scope — backend (phase 2)

- Admin adds a book by archive.org URL or direct PDF upload.
- GitHub Actions pipeline: fetch PDF → OCR → segment → draft MCQs → write drafts
  to the review queue.
- Reviewer interface: draft beside source page image, approve / edit / reject.
- Approved questions sync to the student app.
- Arabic mutun prioritised; Urdu shuroohat handled on a best-effort basis and
  clearly flagged as lower-confidence drafts.

### 5.3 Explicitly out of scope

Leaderboards and competitive ranking. Payments or subscriptions. Teacher/class
management or assigned homework. Audio or recitation. In-app PDF reading of the
full books. Social features. Push notifications. Native app-store builds.

## 6. Requirements

### 6.1 Student app

| ID | Requirement |
|---|---|
| S-1 | Student picks stream (banin/banat), then year, then book, then matn or sharh. |
| S-2 | Practice mode: untimed, one question at a time, immediate correct/incorrect, explanation and source reference revealed after answering. |
| S-3 | Exam mode **Strict**: countdown, linear, no returning to a previous question, auto-submit at zero. |
| S-4 | Exam mode **Board-style**: countdown, student may flag questions and return to them freely before submitting. |
| S-5 | In both exam modes no feedback of any kind appears until the paper is submitted. |
| S-6 | On submission: score, pass/fail against the book's pass mark, per-question review with explanations and source references, shareable result sheet. |
| S-7 | Interface language switchable between Arabic, Urdu and English; layout direction follows the language. |
| S-8 | Progress (books attempted, scores, questions seen) persists on the device with no login. |
| S-9 | Installable as a PWA; previously loaded content works offline. |
| S-10 | Where a book has no approved questions, the app says so plainly rather than showing an empty or filler quiz. |

### 6.2 Question model

| ID | Requirement |
|---|---|
| Q-1 | Every question belongs to exactly one book, which belongs to one year-level and one of matn/sharh. |
| Q-2 | Every question carries a source reference: book id plus page or section. |
| Q-3 | Every question has a state: `draft`, `in_review`, `approved`, `rejected`. |
| Q-4 | Only `approved` questions are served to students. This is enforced at the data layer, not only in the UI. |
| Q-5 | Every question records who approved it and when. |
| Q-6 | Questions have exactly one correct option and at least three distractors. |
| Q-7 | Every question has an explanation shown after answering. |
| Q-8 | Drafts record their extraction confidence and whether the source text was OCR'd Arabic or OCR'd Urdu. |

### 6.3 Admin and ingestion (phase 2)

| ID | Requirement |
|---|---|
| A-1 | Admin adds a book by archive.org URL or by uploading a PDF. |
| A-2 | Ingestion runs on GitHub Actions, not in the browser and not on the user's machine. |
| A-3 | Pipeline stages are resumable and logged; a failed OCR does not lose the book record. |
| A-4 | Reviewer sees the drafted question next to the source page image it came from. |
| A-5 | Bulk approval is not offered. Approval is per question. |
| A-6 | Rejected drafts are retained for pipeline evaluation, never silently deleted. |

## 7. Constraints

- **Cost: zero.** GitHub Pages, GitHub Actions free tier, Supabase free tier.
  No paid API is to be introduced without explicit approval.
- **Hosting:** GitHub Pages serves static files only. It cannot run the
  ingestion backend. Ingestion therefore lives in GitHub Actions; dynamic data
  lives in Supabase.
- **Everything in git from the first commit**, deployed continuously.
- **Hybrid:** one codebase serving web and mobile via PWA.

## 8. Known risks

| Risk | Severity | Mitigation |
|---|---|---|
| Urdu nastaliq OCR produces unusable text | High — likely | Arabic mutun first. Urdu drafts flagged low-confidence. Manual authoring always available as a fallback path. |
| Drafted questions are subtly wrong about a religious ruling | Critical | Human approval gate. Per-question, no bulk approve. Source reference mandatory and visible to students. |
| Review becomes the bottleneck; corpus never fills | Medium | Accepted deliberately. A small verified corpus is the product; a large unverified one is a liability. |
| archive.org link rot breaks ingestion | Medium | Store extracted text and page images in the repo/Supabase, not just the source URL. |
| Copyright on modern shuroohat and publisher editions | Medium | App stores derived questions and short cited excerpts, not book reproductions. Honour the source site's existing copyright/corrections process. |
| Supabase free tier limits exceeded | Low | Student reads are cacheable and the published question set is small; can fall back to shipping approved questions as static JSON with the Pages build. |

## 9. Success criteria

**Prototype is successful if:**

1. All 14 year-levels are navigable with real book data from darsenizami.net.
2. A student can complete a practice session and both exam types end to end.
3. Every question shown is traceable to a book and page.
4. The interface is correct in all three languages, including RTL.
5. It installs and runs on an Android phone.
6. It is live on GitHub Pages.

**The project overall is successful if** a Dars-e-Nizami student uses it to revise
for a real examination and an ustadh, checking a sample of questions against the
books, finds no errors.

## 10. Open questions

- Who besides the owner will hold reviewer access?
- Pass mark — uniform (e.g. 60%) or set per book?
- Should result sheets be shareable as an image for WhatsApp, given the site
  already drives traffic through WhatsApp?
- Is there an existing wifaq/board past-paper format the exam mode should mirror?
