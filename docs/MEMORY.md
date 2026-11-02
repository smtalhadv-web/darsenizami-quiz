# MEMORY — Nisab

Running record of decisions, findings and dead ends.
Read this before starting work. Append to it as decisions are made.

---

## 2026-11-02 — Project opened

### Findings about the corpus

**F1. The source index.** `darsenizami.net/books/darja/` indexes the full
Dars-e-Nizami nisab: 761 banin entries across 8 years (Al-Aula → Dora-e-Hadith)
and 319 banat entries across 6 (Khasa 1–2, Aliyah 1–2, Alamiyah 1–2). Every
year splits into Mutun and Shuroohat on its own page, 28 collection pages in
total. Plus two extra collections: Mantiq o Falsafa (49) and Mutafarriq (115).

**F2. Books are not hosted on the site.** Every "Download" link points to
archive.org, mostly to bulk items like
`archive.org/download/DarsENizami_DarjaAula_1stYear_02/...`. A few point to
mediafire. The site holds metadata and links, not files.

**F3. The site's reader exposes no text.** `darsenizami.net/books/reader/?book=…`
is a shell that iframes the external file. Fetched 2026-11-02, it rendered
"Online view is blocked for this file" with placeholder `#` links. There is no
text layer, no viewer library, no content endpoint. **No book text is obtainable
from darsenizami.net itself.**

**F4. archive.org is blocked from the Claude build sandbox.** Confirmed by the
agent proxy: `connect_rejected — gateway answered 403 to CONNECT,
host archive.org:443`, repeatedly. Plain `curl` to darsenizami.net is blocked
too; only the WebFetch tool reaches it. Consequence: **the agent cannot download
or OCR any book here.** GitHub Actions runners can, which is why ingestion lives
there. See D4.

**F5. The books are scanned nastaliq/naskh page images.** Not verified directly
(see F4) but strongly indicated by filenames, scan-oriented archive.org items,
and the publisher-edition naming (Al Bushra, Rahmania, Haqqania colour scans).
Treat a text layer as absent until stage 2 of ingestion proves otherwise per book.

**F6. Catalogue data is dirty.** Al-Aula matn includes entries literally titled
"D ownload (12MB)" and "D ownload (7MB)" — scraper artefacts from whatever built
the site. Duplicate titles are common (two "Sarf e Meer", two "Ilmun Nahw", two
"Jamal ul Quran") representing different publisher editions. The scraper must
not assume title uniqueness, and malformed entries need flagging rather than
silent inclusion.

### Decisions

**D1. Human approval gate — non-negotiable.**
Questions may be drafted mechanically; none reaches a student without a human
approving it per question. Reason: the corpus includes ʿaqīdah, fiqh and hadith.
A plausible-sounding wrong MCQ about a ruling is misinformation about religion,
carrying the book's authority. Enforced in Postgres via RLS, not just the UI.
*Owner chose this over full automation when the trade-off was put to them.*

**D2. Arabic mutun first; Urdu shuroohat later or never.**
Urdu nastaliq OCR is unreliable on ligature-dense scans. Arabic naskh OCR is
workable. Ingestion prioritises Arabic mutun. Urdu viability is decided by
measurement at TASKS 8.4, not by optimism. *Owner's choice.*

**D3. Three requirements originally conflicted, and were resolved.**
"100% from the books" + "admin uploads and the system converts to a quiz" +
"all services free" cannot all hold: automatic drafting at 1,080-book scale
needs a paid model, and on bad OCR it fabricates. Resolved by replacing
*machine → student* with *machine drafts → human approves → student*.

**D4. Ingestion runs in GitHub Actions.**
It needs archive.org access (F4), real CPU for OCR, and runs in bursts.
Actions is free, has network access, and costs nothing idle. A persistent
server was rejected as costly and mostly idle.

**D5. GitHub Pages cannot host the backend.**
Pages is static only. The original "everything on GitHub Pages" plan is met as:
Pages serves the PWA, Actions runs ingestion, Supabase holds dynamic data. All
free tier.

**D6. Catalogue ships as static JSON, not a database table.**
Rarely changes, read on every page load, and shipping it with the build keeps
navigation working offline and when Supabase is down.

**D7. One session engine, three configs.**
Practice / exam-strict / exam-board differ only by `timeLimitSec`,
`allowRevisit` and `feedback`. Pure state machine, no React, no I/O — so the
modes can be unit-tested, which is where bugs would otherwise hide.

**D8. Trilingual, with content language independent of UI language.**
UI in ar / ur / en with a toggle. An Arabic matn question stays Arabic when the
UI is English. *Owner selected all language options; read as full i18n.*

**D9. Both exam presets, because they were contradictory as a single mode.**
Owner selected both "no going back" and "revisiting allowed". These cannot
coexist in one mode, so they became two admin-selectable presets: Strict and
Board-style. Both withhold feedback until submit; both have a pass mark and a
result sheet. *Interpretation stated back to the owner and agreed.*

**D10. No accounts in the prototype.** Device-local progress only.

**D11. Prototype = 14-year shell + two deep year-levels.**
All 14 years navigable with real catalogue data; verified question sets only in
Al-Aula and Banat Khasa 1. Rejected: thin fake coverage everywhere.

**D12. Seed questions are hand-authored, not OCR output.**
Because of F4 the agent cannot produce drafts here. Better 40 verified questions
than 400 unverified ones.

**D13. Template extraction before any language model.**
First drafting pass uses patterns (باب, فصل, numbered lists, definition
formulae) rather than a model. Predictable and free; wastes less reviewer time
than a creative generator that hallucinates. Revisit once real accept/reject
data exists.

**D14. Western Arabic numerals (1,2,3) in all locales** for timers and counters.
Eastern Arabic-Indic numerals render inconsistently across Android fonts;
legibility on a timer outweighs orthographic purity.

### Ruled out

- Full automation with no review — D1.
- Native mobile apps — PWA covers web and mobile free, no store accounts.
- Hosting books in-app — out of scope, and a copyright problem.
- Bulk approval — rubber-stamping; defeats D1.
- Catalogue in Postgres — D6.
- Paid OCR or model APIs — zero-cost constraint.
- Gamification (streaks, leaderboards, confetti) — wrong register for the material.

### Open

| # | Question | Owner decision needed |
|---|---|---|
| O1 | Pass mark uniform or per book? | yes |
| O2 | Who else gets reviewer access? | yes |
| O3 | Result sheet shareable to WhatsApp? | yes |
| O4 | Does a wifaq/board past-paper format exist to mirror? | yes |
| O5 | Option lettering ا/ب/ج/د or numerals? | yes |
| O6 | Practice "reveal source passage" — helpful or crutch? | design |
| O7 | Which exact seed books for Al-Aula and Khasa 1? | yes |

### Next

Awaiting owner approval of the four spec docs (TASKS 0.5), then the
implementation plan via the writing-plans skill. No product code until then.
