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

**F7. Hugging Face is blocked from the build sandbox too.** `CONNECT tunnel
failed, 403` for huggingface.co, same as archive.org. pypi and npm are
reachable. Consequence: any tool that downloads models at runtime — MinerU,
PaddleOCR, TrOCR, UTRNet — **cannot be run or evaluated here at all**. Model-based
work must happen on GitHub Actions or the owner's machine.

**F8. Measured OCR accuracy, 2026-11-02.** Rendered known Arabic and Urdu lines
to clean images with Noto Naskh / Noto Nastaliq and scored Tesseract against the
source text. Clean synthetic text is the easiest possible input, so these are
upper bounds, not expectations for real scans:

| Script | Engine | CER | WER |
|---|---|---|---|
| Arabic naskh | Tesseract `ara` | 0.140 | 0.444 |
| Urdu nastaliq | Tesseract `ara` | 1.411 | 1.000 |

Urdu output was repeating `لالالا` — noise, not degraded text. This reproduces
the LREC 2026 published figure (CER 1.420) almost exactly. This box has no `urd`
traineddata (22 languages, Urdu absent), so the Arabic model was used; the
published Urdu-model number is no better.

**F9. Only VLMs reach usable Nastaliq accuracy.** LREC 2026 benchmark on printed
Nastaliq: Gemini-2.5-Pro CER 0.125, GPT-4.1 0.203, TrOCR 0.177, Kraken 0.305,
UTRNet 0.638, Tesseract 1.420. Every non-VLM classical OCR engine is far behind.

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

**D15. Tesseract is dropped for Urdu, kept for Arabic.** Supersedes the part of
D2 that assumed Tesseract could do Urdu at all. Evidence: F8, F9. Arabic naskh
at CER 0.14 on clean text is reviewable; Urdu at CER 1.41 is noise. This is now
measured, not predicted.

**D16. MinerU adopted for layout, not for recognition.** Madrasa editions
interleave matn and hashiya on one page; naive full-page OCR destroys reading
order before recognition accuracy even matters. MinerU does layout detection and
reading-order reconstruction, runs on CPU, Apache-2.0 based. It is not a
Nastaliq fix: its pipeline backend is PaddleOCR (naskh-trained Arabic) and its
VLM is predominantly Chinese/English. **Untested here** — F7 blocks model
downloads. Suggested by the owner 2026-11-02.

**D18. Gemini chosen for Urdu Nastaliq; implemented, untested.** Owner has
Gemini. Stage built at `scripts/ingest/ocr-gemini.mjs` + `.github/workflows/
ocr-trial.yml`. Key lives in an Actions secret, never in the repo or bundle.
Two-pass self-divergence detects hallucination: a model that transcribes one
image two different ways is improvising on at least one pass.
**Unverified** — generativelanguage.googleapis.com is blocked in the sandbox
(F7 extends to it), so the request/response path has never run. First real run
must be the ocr-trial workflow.
Caveat on F9: Gemini 2.5-Pro, which scored CER 0.125, is **not on the free tier
for new projects** — new projects route to 3.x Flash. The benchmark number does
not transfer to what the free tier actually serves; measure it.
Second caveat: owner said "Gemini Pro", which may mean the consumer
subscription rather than an AI Studio API key. Those are different things and
only the latter drives a pipeline. Needs confirming.

**D17. Urdu needs a VLM, which conflicts with zero cost — unresolved.**
Recorded as an open conflict rather than papered over. Candidate resolutions,
none yet chosen: (a) Gemini free-tier quota, accepting an external dependency
and rate limits; (b) a local VLM on Actions CPU via MinerU's llama.cpp backend,
free but slow and unproven on Nastaliq; (c) Urdu shuroohat stay hand-authored
indefinitely. Volume is bounded because every question is human-reviewed anyway
(D1), so free-tier quotas may suffice. Needs the owner's decision.

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
