# DESIGN — Nisab

**Date:** 2026-11-02
**Status:** Draft for approval — the prototype's theme is approved from this.

---

## 1. Design intent

The books are centuries old and are read with reverence. The app around them
should feel like a well-made study aid in a madrasa, not a gamified language app.
No confetti, no streak flames, no cartoon mascots, no "You're on fire! 🔥".

The register to aim for: **a clean examination paper and a quiet library.**
Serious, legible, unhurried, respectful of the material. Dignity over delight.

What that rules out: celebratory animation on correct answers, countdown timers
that flash red and pulse, score-shaming language, anything that treats a wrong
answer about ʿaqīdah as a game event.

What it rules in: generous white space, strong typographic hierarchy, restrained
colour used for meaning rather than decoration, and text set at a size an adult
can read comfortably on a phone in poor light.

## 2. Visual language

### 2.1 Colour

Anchored to darsenizami.net's existing green (`#0d7a3f`) so the app reads as part
of the same family.

```
--ink              #14241c   near-black green, body text
--ink-muted        #5b6b63   secondary text
--surface          #ffffff
--surface-sunk     #f4f7f5   cards, option rows
--line             #dfe6e2

--brand            #0d7a3f   headers, primary actions
--brand-deep       #09532b   pressed, headings
--brand-wash       #eaf4ee   selected option background

--correct          #1a7f4b
--incorrect        #9e2b2b
--flag             #9a6b16   flagged-for-review marker
```

Dark mode mirrors these with the same semantics, not a mechanical inversion:
surfaces go to a deep desaturated green-black, brand lightens to stay legible.

**Colour never carries meaning alone.** Correct and incorrect always pair the
colour with an icon and a word, for colour-blind users and for printing.

### 2.2 Type

| Role | Arabic | Urdu | English |
|---|---|---|---|
| Book / question content | Noto Naskh Arabic | Noto Nastaliq Urdu | — |
| Interface | Noto Kufi Arabic | Noto Nastaliq Urdu | Inter |

Nastaliq needs vertical room. Urdu line-height runs ~2.1 against ~1.6 for
English; this is not optional padding, it is how the script sits.

Arabic matn quoted inside a question is set larger than the surrounding UI and
in naskh, visually distinct from the question wrapper — the student should see at
a glance which words are the book's and which are ours.

Content scale is deliberately large: question stem ~20px, options ~18px minimum
on mobile.

### 2.3 Form

Rounded 10px corners, hairline borders, almost no shadow. Flat and papery.
A single accent rule under screen headings, in brand green.

Spacing on a 4px scale. Tap targets never below 48px.

## 3. Screens

### 3.1 Home — stream and year

The whole 14-year curriculum visible without scrolling on a desktop, two taps
deep on mobile.

```
┌────────────────────────────────────┐
│  نصاب  Nisab              [ع][اردو][EN] │
│  Dars-e-Nizami practice            │
├────────────────────────────────────┤
│  بنین  Banin                        │
│  ┌──────────┐ ┌──────────┐         │
│  │ الاولی    │ │ الثانیہ   │  ...     │
│  │ 1st Year │ │ 2nd Year │         │
│  │ 92 books │ │ 95 books │         │
│  │ ● 40 Qs  │ │ ○ none   │         │
│  └──────────┘ └──────────┘         │
│                                     │
│  بنات  Banat                        │
│  ┌──────────┐ ┌──────────┐         │
│  │ خاصہ ۱    │ │ خاصہ ۲    │  ...     │
│  └──────────┘ └──────────┘         │
└────────────────────────────────────┘
```

A year card shows its real book count and its real approved-question count.
`○ none` is shown plainly, not hidden — per RULES R2.1.

### 3.2 Year — matn and sharh

Two tabs, matn first. A list of real books with Urdu title under English title,
author where known, and question availability. Books without questions are
listed, visibly inactive, and say "no questions yet" rather than vanishing.

### 3.3 Book — choose a mode

Three cards, with what each actually does stated plainly:

- **مشق · Practice** — untimed · answers shown as you go
- **امتحان · Examination (Strict)** — timed · no going back · results at the end
- **امتحان بورڈ · Examination (Board)** — timed · flag and return · results at the end

Below: question count, pass mark, and previous attempts from this device.

### 3.4 Question screen

The core screen. One question, four or more options, nothing else competing.

```
┌────────────────────────────────────┐
│ ← Sarf e Meer            7 / 20  ⏱ 12:04 │
│ ▓▓▓▓▓▓▓░░░░░░░░░░░░░                │
├────────────────────────────────────┤
│                                     │
│   « الفعل الماضي ما دل على حدث      │
│      في الزمان الماضي »              │
│                                     │
│   اس تعریف کے مطابق فعل ماضی کیا     │
│   ظاہر کرتا ہے؟                      │
│                                     │
│  ┌──────────────────────────────┐  │
│  │ ا)  گزرا ہوا زمانہ             │  │
│  ├──────────────────────────────┤  │
│  │ ب)  حال کا زمانہ               │  │
│  ├──────────────────────────────┤  │
│  │ ج)  مستقبل                    │  │
│  └──────────────────────────────┘  │
│                                     │
│  [ ⚑ نشان ]            [ آگے → ]    │
└────────────────────────────────────┘
```

- Quoted matn sits in a bordered block, naskh, larger — unmistakably the book's
  words.
- Timer is plain text. It does not flash, pulse, or turn red. It turns amber
  under two minutes and that is all.
- Flag button appears only in board mode and practice, never in strict.
- In strict mode there is no back control at all — not a disabled one. The
  affordance does not exist, so the student is never tempted and never confused.

**Practice mode after answering:** the chosen option marks correct or incorrect
with icon and word, the explanation appears below, and the source line reads
*Sarf e Meer · p. 14* — tappable to the book on darsenizami.net.

**Exam modes after answering:** the option shows as selected. Nothing else
changes. No hint of correctness until submission.

### 3.5 Submission and result

Exam modes show a review grid before final submit: answered, unanswered, flagged.
Unanswered count is stated explicitly, because submitting a paper with blanks by
accident is a real and avoidable harm.

Result sheet: score, pass or fail against the book's mark, then every question
with the student's answer, the correct answer, the explanation and the source
reference. The sheet is the learning artefact — it is longer and more detailed
than the score.

Tone on failure is factual: "14 / 20 — below the 60% pass mark." Not "Don't give
up!" and not "You failed."

## 4. Reviewer interface (phase 2)

Built for reading carefully, not for clearing a queue fast.

Split view: drafted question on one side, **the source page image on the other**,
so the reviewer checks against the book rather than against their memory.

Actions: Approve · Edit then approve · Reject with reason. No bulk control
anywhere on the screen, by design and per RULES R1.2.

Shown prominently before any action: extraction confidence and whether the source
was Arabic or Urdu OCR, so the reviewer calibrates their scepticism.

## 5. Direction and layout

Arabic and Urdu are RTL; English LTR. The progress bar, the back chevron, option
lettering (ا ب ج / A B C) and the next button all mirror. Numerals stay Western
Arabic (1, 2, 3) in all locales for the timer and question counter — Eastern
Arabic-Indic numerals are inconsistently rendered across Android fonts and risk
illegibility, which matters more than orthographic purity on a timer.

Every screen is checked in all three locales before it is considered done.

## 6. Accessibility

Text contrast meets WCAG AA. Tap targets ≥ 48px. Full keyboard operation of the
question screen (number keys select options, Enter advances). Screen-reader
labels on every control, localised. Respects `prefers-reduced-motion` — and
since there is almost no motion by design, there is little to suppress.

Readable at 200% zoom without horizontal scrolling, which matters for older
ustadhs reviewing on a phone.

## 7. Open design questions

- Should the result sheet export as an image for WhatsApp sharing, given the
  site's existing WhatsApp channel?
- Should practice mode offer a "reveal source passage" control, or does that
  encourage lookup over recall?
- Do madrasa students expect ا/ب/ج/د option lettering, or numerals?
