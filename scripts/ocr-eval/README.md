# OCR benchmark

Reproduces the measurement behind ARCHITECTURE §5.1 and MEMORY F8.

Renders known Arabic (naskh) and Urdu (nastaliq) lines to clean images with the
Noto fonts, runs Tesseract over them, and reports CER/WER against the source.

```bash
npm install @fontsource/noto-naskh-arabic @fontsource/noto-nastaliq-urdu
pip install fonttools brotli arabic-reshaper python-bidi pytesseract jiwer
python3 convert-fonts.py        # woff2 -> ttf
python3 benchmark.py
```

## Result, 2026-11-02

| Script | Engine | CER | WER |
|---|---|---|---|
| Arabic naskh | Tesseract `ara` | 0.140 | 0.444 |
| Urdu nastaliq | Tesseract `ara` | 1.411 | 1.000 |

**Read this correctly.** The input is cleanly rendered digital text — the
easiest case there is. A scanned 20th-century madrasa print will be worse.
These are upper bounds on achievable quality, not predictions.

Urdu output was repeating `لالالا`: noise, not degraded text. A CER above 1.0
means more errors than there are characters.

## Next

The number that actually decides phase 8 is CER on **real scanned pages**, not
on synthetic text. That cannot be measured in the Claude sandbox — archive.org
and Hugging Face are both network-blocked there (MEMORY F4, F7). Run it on
GitHub Actions or locally with real PDFs before committing to the Arabic path.
