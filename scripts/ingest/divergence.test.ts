/**
 * Tests for the self-divergence metric used to detect VLM hallucination
 * in scripts/ingest/ocr-gemini.mjs.
 *
 * The logic is duplicated here rather than imported because the script is a
 * standalone .mjs CLI. If one changes, change both — the duplication is
 * deliberate and small.
 */
import { describe, it, expect } from 'vitest';

function cer(a: string, b: string): number {
  const s = [...a.replace(/\s+/g, ' ').trim()];
  const t = [...b.replace(/\s+/g, ' ').trim()];
  if (!s.length && !t.length) return 0;
  if (!s.length || !t.length) return 1;
  let prev = Array.from({ length: t.length + 1 }, (_, i) => i);
  for (let i = 1; i <= s.length; i++) {
    const cur = [i];
    for (let j = 1; j <= t.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (s[i - 1] === t[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[t.length] / Math.max(s.length, t.length);
}

const band = (d: number) => (d < 0.02 ? 'high' : d < 0.10 ? 'medium' : 'low');

describe('divergence metric', () => {
  it('is zero for identical transcriptions', () => {
    expect(cer('الفعل الماضي ما دل على حدث', 'الفعل الماضي ما دل على حدث')).toBe(0);
  });

  it('ignores whitespace differences', () => {
    expect(cer('کلمہ کی تین  قسمیں', ' کلمہ کی تین قسمیں ')).toBe(0);
  });

  it('is small for a one-character difference in a long line', () => {
    const a = 'الاسم ما دل على معنى في نفسه ولم يقترن بزمان';
    const b = 'الاسم ما دل على معنى في نفسه ولم يقترن بزمات';
    expect(cer(a, b)).toBeLessThan(0.05);
  });

  it('is large when the model rewrites the line', () => {
    const a = 'فعل ماضی وہ ہے جو گزرے ہوئے زمانے پر دلالت کرے';
    const b = 'اسم وہ کلمہ ہے جس کا معنی مستقل ہو اور زمانہ نہ ہو';
    expect(cer(a, b)).toBeGreaterThan(0.4);
  });

  it('is 1 when one pass returns nothing', () => {
    expect(cer('کلمہ کی تین قسمیں', '')).toBe(1);
    expect(cer('', 'کلمہ کی تین قسمیں')).toBe(1);
  });

  it('is 0 when both passes return nothing', () => {
    expect(cer('', '')).toBe(0);
  });

  it('counts Arabic characters, not UTF-16 units', () => {
    // [...str] iterates code points; a naive .length would differ
    const a = 'بسم الله';
    expect(cer(a, a)).toBe(0);
  });
});

describe('confidence banding', () => {
  it('bands identical passes as high', () => {
    expect(band(cer('نحو میر', 'نحو میر'))).toBe('high');
  });

  it('bands a rewritten line as low', () => {
    const d = cer(
      'فاعل مرفوع ہوتا ہے اور مفعول منصوب',
      'مبتدا مرفوع ہوتا ہے اور خبر بھی مرفوع ہوتی ہے',
    );
    expect(band(d)).toBe('low');
  });

  it('treats the boundaries as specified', () => {
    expect(band(0.0)).toBe('high');
    expect(band(0.019)).toBe('high');
    expect(band(0.02)).toBe('medium');
    expect(band(0.099)).toBe('medium');
    expect(band(0.10)).toBe('low');
    expect(band(1)).toBe('low');
  });
});
