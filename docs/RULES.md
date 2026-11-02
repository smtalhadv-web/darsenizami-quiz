# RULES — Nisab

Rules binding on anyone, human or agent, working in this repository.
Where a rule here conflicts with convenience, the rule wins.

---

## 1. Content integrity — the rules that outrank the others

**R1.1 No unapproved question ever reaches a student.**
Enforced in Postgres by row-level security, not merely in the client. Do not add
a code path, build step, export, or "preview mode" that serves unapproved
questions to a student-facing surface.

**R1.2 Approval is per question.**
Never add bulk approve, approve-all, auto-approve above a confidence threshold,
or approve-by-default. A reviewer who has not read a question has not approved
it.

**R1.3 Every published question cites its source.**
Book plus page or section, visible to the student. A question whose source
cannot be identified is rejected, not published with the field blank.

**R1.4 Never invent book content.**
Do not write a question from memory of what a text "generally says". Do not let
a model fill a gap in OCR output. If the passage is unreadable, the passage
produces no question. An empty book is acceptable; a fabricated one is not.

**R1.5 Do not soften or editorialise the source.**
Questions test what the book says. Where texts differ between madhahib or
editions, the question names the book it comes from rather than presenting one
position as settled.

**R1.6 Rejected drafts are kept.**
They are the only evidence of how well extraction is working. Never purge them.

## 2. Honesty in the product

**R2.1 Never fake coverage.**
A book with no approved questions says so. Do not pad with placeholder
questions, lorem text, or questions from a different book.

**R2.2 Counts are real.**
Question counts, progress figures and coverage percentages are computed from
actual approved data, never estimated or hardcoded for appearance.

**R2.3 Flag low-confidence provenance.**
Where a question was drafted from Urdu OCR, the reviewer sees that before
approving. Do not hide extraction metadata from reviewers to make the queue look
cleaner.

## 3. Scope discipline

**R3.1 Build what is in the PRD.**
Features absent from PRD §5.3 are out. Adding leaderboards, streaks, social
sharing, gamification or notifications requires a PRD change first.

**R3.2 YAGNI.**
No abstraction layer for a second database, a second auth provider, or a
hypothetical future platform. Build for what exists.

**R3.3 Zero cost is a hard constraint.**
No dependency, service or API that bills, trials, or requires a card. If a task
appears to need one, stop and raise it rather than quietly adding it.

## 4. Code

**R4.1 Business logic stays out of components.**
`session/`, `catalogue/`, `questions/`, `progress/` contain no React and no JSX.
`ui/` contains no quiz rules.

**R4.2 The session engine is pure.**
No I/O, no timers of its own, no randomness it does not receive. It takes
events, returns state. Clock ticks arrive as `TICK` events from outside.

**R4.3 Tests before implementation for the engine.**
The three modes are the correctness core. Write the failing test first. Rules
like "strict mode cannot return to a previous question" must have a test that
fails if the rule is removed.

**R4.4 Files stay focused.**
A file past roughly 300 lines is a prompt to re-examine its boundaries.

**R4.5 No secrets in the client.**
Only the Supabase publishable anon key reaches the bundle. Service keys live in
Actions secrets. Never commit a key, never log one.

## 5. Internationalisation

**R5.1 No hardcoded user-facing strings.** Everything through `i18n/`.

**R5.2 Logical CSS properties only.**
`margin-inline-start`, `padding-inline-end`, `text-align: start`. Never `left` or
`right` for anything that flips with direction.

**R5.3 Direction follows locale, set once.**
On `<html dir>`. Never per-component, never conditional on content.

**R5.4 Nastaliq for Urdu, naskh for Arabic.**
They are different scripts. Do not share a font between them.

**R5.5 Content language is independent of UI language.**
Changing the interface to English never translates an Arabic matn question.

**R5.6 Every locale must be checked before shipping a screen.**
A layout that works in English and breaks in Urdu is not done.

## 6. Data and sources

**R6.1 Be polite to darsenizami.net and archive.org.**
Serial requests, identify the scraper, cache aggressively, never hammer. The
source site is the owner's own; archive.org is not.

**R6.2 Store extracted text, not just links.**
Link rot must not destroy work already done.

**R6.3 Respect the corpus's copyright position.**
The app stores derived questions and short cited excerpts. It does not
redistribute books. Honour the source site's copyright and corrections process.

## 7. Git

**R7.1 Everything in git from the first commit.** No untracked working state.

**R7.2 Commits are small and describe why.**

**R7.3 Never commit secrets, PDFs, or page images.** Large binaries live in
Supabase storage or Actions artefacts. `.gitignore` enforces it.

**R7.4 `main` always deploys.** A commit that breaks the build gets fixed or
reverted, not left.

## 8. For agents working in this repo

**R8.1 Read `docs/MEMORY.md` first.** It holds decisions already made and paths
already ruled out.

**R8.2 Record decisions in `docs/MEMORY.md` as they are made**, with the reason.

**R8.3 Do not relax a rule in this file to make a task pass.** Raise the conflict
instead.

**R8.4 Do not claim something works without running it.** "Should work" is not a
result.

**R8.5 When the corpus is unreachable, say so.** Do not substitute remembered
content for fetched content. See R1.4.
