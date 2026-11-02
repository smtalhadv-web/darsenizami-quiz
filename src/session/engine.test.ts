import { describe, it, expect } from 'vitest';
import { createSession, reduce, canRevisit, isFeedbackVisible } from './engine';
import { MODE_PRESETS, type Mode, type Question, type SessionState } from './types';

/** Minimal question factory — content is irrelevant to engine behaviour. */
function q(id: string, correct = 'a'): Question {
  return {
    id,
    bookId: 'test-book',
    stem: { en: `stem ${id}` },
    options: [
      { id: 'a', text: { en: 'a' } },
      { id: 'b', text: { en: 'b' } },
      { id: 'c', text: { en: 'c' } },
      { id: 'd', text: { en: 'd' } },
    ],
    correctOptionId: correct,
    explanation: { en: `because ${id}` },
    source: { bookId: 'test-book', page: 1 },
    origin: 'authored',
  };
}

const QS = [q('q1'), q('q2', 'b'), q('q3'), q('q4', 'c'), q('q5')];

function start(mode: Mode, questions = QS, passMark = 0.6): SessionState {
  return createSession({ mode, questions, passMark, ...MODE_PRESETS[mode] });
}

function apply(state: SessionState, ...events: Parameters<typeof reduce>[1][]): SessionState {
  return events.reduce((s, e) => reduce(s, e), state);
}

describe('createSession', () => {
  it('starts active, at the first question, with nothing answered', () => {
    const s = start('practice');
    expect(s.phase).toBe('active');
    expect(s.index).toBe(0);
    expect(s.answers).toEqual({});
    expect(s.flagged).toEqual([]);
    expect(s.result).toBeNull();
  });

  it('is untimed in practice and timed in both exam modes', () => {
    expect(start('practice').remainingSec).toBeNull();
    expect(start('exam-strict').remainingSec).toBe(20 * 60);
    expect(start('exam-board').remainingSec).toBe(25 * 60);
  });
});

describe('practice mode', () => {
  it('reveals feedback immediately once a question is answered', () => {
    let s = start('practice');
    expect(isFeedbackVisible(s)).toBe(false); // nothing answered yet
    s = apply(s, { type: 'ANSWER', optionId: 'a' });
    expect(isFeedbackVisible(s)).toBe(true);
  });

  it('allows returning to an earlier question', () => {
    const s = apply(start('practice'), { type: 'NEXT' }, { type: 'PREV' });
    expect(canRevisit(s)).toBe(true);
    expect(s.index).toBe(0);
  });

  it('never runs out of time', () => {
    const s = apply(start('practice'), { type: 'TICK', seconds: 99999 });
    expect(s.phase).toBe('active');
    expect(s.remainingSec).toBeNull();
  });
});

describe('exam-strict mode', () => {
  it('refuses to go back to a previous question', () => {
    let s = start('exam-strict');
    s = apply(s, { type: 'NEXT' }, { type: 'NEXT' });
    expect(s.index).toBe(2);
    s = apply(s, { type: 'PREV' });
    expect(s.index).toBe(2); // unchanged
  });

  it('refuses GOTO to an earlier index but allows forward movement', () => {
    let s = apply(start('exam-strict'), { type: 'NEXT' }, { type: 'NEXT' });
    expect(apply(s, { type: 'GOTO', index: 0 }).index).toBe(2);
    expect(apply(s, { type: 'GOTO', index: 3 }).index).toBe(3);
  });

  it('reports revisiting as unavailable', () => {
    expect(canRevisit(start('exam-strict'))).toBe(false);
  });

  it('locks an answer once given', () => {
    let s = apply(start('exam-strict'), { type: 'ANSWER', optionId: 'a' });
    s = apply(s, { type: 'ANSWER', optionId: 'b' });
    expect(s.answers['q1']).toBe('a');
  });

  it('auto-submits when the clock reaches zero', () => {
    const s = apply(start('exam-strict'), { type: 'TICK', seconds: 20 * 60 });
    expect(s.remainingSec).toBe(0);
    expect(s.phase).toBe('submitted');
    expect(s.result?.autoSubmitted).toBe(true);
  });

  it('does not let the clock go negative', () => {
    const s = apply(start('exam-strict'), { type: 'TICK', seconds: 99999 });
    expect(s.remainingSec).toBe(0);
  });
});

describe('exam-board mode', () => {
  it('allows free navigation in both directions', () => {
    let s = apply(start('exam-board'), { type: 'NEXT' }, { type: 'NEXT' }, { type: 'PREV' });
    expect(s.index).toBe(1);
    s = apply(s, { type: 'GOTO', index: 0 });
    expect(s.index).toBe(0);
  });

  it('flags and unflags a question', () => {
    let s = apply(start('exam-board'), { type: 'FLAG' });
    expect(s.flagged).toEqual(['q1']);
    s = apply(s, { type: 'FLAG' });
    expect(s.flagged).toEqual([]);
  });

  it('allows changing an answer before submission', () => {
    let s = apply(start('exam-board'), { type: 'ANSWER', optionId: 'a' });
    s = apply(s, { type: 'ANSWER', optionId: 'b' });
    expect(s.answers['q1']).toBe('b');
  });
});

/**
 * The rule that matters most: an exam must not leak correctness before
 * submission. If someone removes the guard, this fails.
 */
describe('feedback withholding (the integrity rule)', () => {
  it.each(['exam-strict', 'exam-board'] as const)(
    '%s never shows feedback while active, however many questions are answered',
    (mode) => {
      let s = start(mode);
      for (let i = 0; i < QS.length; i++) {
        s = apply(s, { type: 'ANSWER', optionId: 'a' }, { type: 'NEXT' });
        expect(isFeedbackVisible(s)).toBe(false);
      }
      expect(s.phase).toBe('active');
    },
  );

  it.each(['exam-strict', 'exam-board'] as const)(
    '%s exposes no result object before submission',
    (mode) => {
      const s = apply(start(mode), { type: 'ANSWER', optionId: 'a' }, { type: 'NEXT' });
      expect(s.result).toBeNull();
    },
  );

  it('shows feedback in every mode after submission', () => {
    for (const mode of ['practice', 'exam-strict', 'exam-board'] as const) {
      const s = apply(start(mode), { type: 'SUBMIT' });
      expect(isFeedbackVisible(s)).toBe(true);
    }
  });
});

describe('navigation bounds', () => {
  it('does not advance past the last question', () => {
    let s = start('exam-board');
    for (let i = 0; i < 20; i++) s = apply(s, { type: 'NEXT' });
    expect(s.index).toBe(QS.length - 1);
  });

  it('does not move before the first question', () => {
    const s = apply(start('exam-board'), { type: 'PREV' }, { type: 'PREV' });
    expect(s.index).toBe(0);
  });

  it('ignores an out-of-range GOTO', () => {
    const s = apply(start('exam-board'), { type: 'GOTO', index: 99 });
    expect(s.index).toBe(0);
  });
});

describe('scoring', () => {
  it('scores over total questions, not over answered ones', () => {
    // answer only q1 correctly, leave four blank
    const s = apply(start('exam-board'), { type: 'ANSWER', optionId: 'a' }, { type: 'SUBMIT' });
    expect(s.result?.correct).toBe(1);
    expect(s.result?.answered).toBe(1);
    expect(s.result?.total).toBe(5);
    expect(s.result?.score).toBeCloseTo(0.2);
  });

  it('marks unanswered questions as incorrect, not skipped', () => {
    const s = apply(start('exam-board'), { type: 'SUBMIT' });
    expect(s.result?.questions.every((r) => !r.correct && !r.answered)).toBe(true);
    expect(s.result?.score).toBe(0);
  });

  it('applies the pass mark', () => {
    // 3 of 5 correct = 0.6, exactly the pass mark -> pass
    let s = start('exam-board', QS, 0.6);
    s = apply(
      s,
      { type: 'ANSWER', optionId: 'a' }, // q1 correct
      { type: 'NEXT' },
      { type: 'ANSWER', optionId: 'b' }, // q2 correct
      { type: 'NEXT' },
      { type: 'ANSWER', optionId: 'a' }, // q3 correct
      { type: 'SUBMIT' },
    );
    expect(s.result?.score).toBeCloseTo(0.6);
    expect(s.result?.passed).toBe(true);
  });

  it('fails just below the pass mark', () => {
    let s = start('exam-board', QS, 0.6);
    s = apply(
      s,
      { type: 'ANSWER', optionId: 'a' },
      { type: 'NEXT' },
      { type: 'ANSWER', optionId: 'b' },
      { type: 'SUBMIT' },
    );
    expect(s.result?.score).toBeCloseTo(0.4);
    expect(s.result?.passed).toBe(false);
  });

  it('reports which option the student chose for every question', () => {
    const s = apply(start('exam-board'), { type: 'ANSWER', optionId: 'd' }, { type: 'SUBMIT' });
    const first = s.result!.questions[0];
    expect(first.chosenOptionId).toBe('d');
    expect(first.correct).toBe(false);
    expect(s.result!.questions[1].chosenOptionId).toBeNull();
  });
});

describe('after submission', () => {
  it('ignores further answers and navigation', () => {
    let s = apply(start('exam-board'), { type: 'SUBMIT' });
    const after = apply(s, { type: 'ANSWER', optionId: 'a' }, { type: 'NEXT' }, { type: 'FLAG' });
    expect(after.answers).toEqual(s.answers);
    expect(after.index).toBe(s.index);
    expect(after.flagged).toEqual(s.flagged);
  });

  it('does not submit twice or change the result', () => {
    const s = apply(start('exam-board'), { type: 'SUBMIT' });
    const again = apply(s, { type: 'SUBMIT' });
    expect(again.result).toEqual(s.result);
  });

  it('a manual submit is not marked auto-submitted', () => {
    const s = apply(start('exam-strict'), { type: 'SUBMIT' });
    expect(s.result?.autoSubmitted).toBe(false);
  });
});

describe('purity', () => {
  it('does not mutate the state it is given', () => {
    const s = start('exam-board');
    const snapshot = JSON.stringify(s);
    reduce(s, { type: 'ANSWER', optionId: 'a' });
    reduce(s, { type: 'NEXT' });
    reduce(s, { type: 'SUBMIT' });
    expect(JSON.stringify(s)).toBe(snapshot);
  });
});

describe('empty question set', () => {
  it('submits to a zero result rather than crashing', () => {
    const s = apply(start('practice', []), { type: 'SUBMIT' });
    expect(s.result?.total).toBe(0);
    expect(s.result?.score).toBe(0);
    expect(s.result?.passed).toBe(false);
  });
});
