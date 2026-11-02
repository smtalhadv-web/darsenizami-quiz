/**
 * The session engine.
 *
 * Pure: no React, no I/O, no timers, no randomness (RULES R4.2).
 * One engine, three modes, differing only by SessionConfig (ARCHITECTURE D7).
 */

import type {
  Question,
  Result,
  QuestionResult,
  SessionConfig,
  SessionEvent,
  SessionState,
} from './types';

export function createSession(config: SessionConfig): SessionState {
  return {
    config,
    phase: 'active',
    index: 0,
    answers: {},
    flagged: [],
    remainingSec: config.timeLimitSec,
    result: null,
  };
}

/** Whether the student may move to an earlier question in this mode. */
export function canRevisit(state: SessionState): boolean {
  return state.config.allowRevisit;
}

/**
 * Whether correctness may be shown right now.
 *
 * After submission: always. While active: only in immediate-feedback mode and
 * only once the current question has been answered. Exams never qualify.
 */
export function isFeedbackVisible(state: SessionState): boolean {
  if (state.phase === 'submitted') return true;
  if (state.config.feedback !== 'immediate') return false;
  const current = currentQuestion(state);
  return current ? current.id in state.answers : false;
}

export function currentQuestion(state: SessionState): Question | null {
  return state.config.questions[state.index] ?? null;
}

export function answeredCount(state: SessionState): number {
  return Object.keys(state.answers).length;
}

export function unansweredQuestions(state: SessionState): Question[] {
  return state.config.questions.filter((q) => !(q.id in state.answers));
}

export function isFlagged(state: SessionState, questionId: string): boolean {
  return state.flagged.includes(questionId);
}

function grade(config: SessionConfig, answers: Record<string, string>, autoSubmitted: boolean): Result {
  const questions: QuestionResult[] = config.questions.map((question) => {
    const chosen = answers[question.id] ?? null;
    return {
      question,
      chosenOptionId: chosen,
      answered: chosen !== null,
      correct: chosen !== null && chosen === question.correctOptionId,
    };
  });

  const total = questions.length;
  const correct = questions.filter((r) => r.correct).length;
  // Scored over total, not over answered: a blank is wrong, not excused.
  const score = total === 0 ? 0 : correct / total;

  return {
    total,
    answered: questions.filter((r) => r.answered).length,
    correct,
    score,
    passed: total > 0 && score >= config.passMark,
    autoSubmitted,
    questions,
  };
}

function submit(state: SessionState, autoSubmitted: boolean): SessionState {
  if (state.phase === 'submitted') return state;
  return {
    ...state,
    phase: 'submitted',
    result: grade(state.config, state.answers, autoSubmitted),
  };
}

function clampIndex(state: SessionState, next: number): number {
  const last = state.config.questions.length - 1;
  if (last < 0) return 0;
  if (next < 0 || next > last) return state.index;
  // In a linear exam the student may move forward only. The UI renders no
  // back control at all, but the engine refuses regardless (RULES R4.3).
  if (!state.config.allowRevisit && next < state.index) return state.index;
  return next;
}

export function reduce(state: SessionState, event: SessionEvent): SessionState {
  // Once submitted the session is immutable apart from nothing at all.
  if (state.phase === 'submitted' && event.type !== 'SUBMIT') return state;

  switch (event.type) {
    case 'ANSWER': {
      const question = currentQuestion(state);
      if (!question) return state;
      // Strict mode locks an answer once given; other modes allow changes.
      const locked = !state.config.allowRevisit && question.id in state.answers;
      if (locked) return state;
      return { ...state, answers: { ...state.answers, [question.id]: event.optionId } };
    }

    case 'NEXT':
      return { ...state, index: clampIndex(state, state.index + 1) };

    case 'PREV':
      return { ...state, index: clampIndex(state, state.index - 1) };

    case 'GOTO':
      return { ...state, index: clampIndex(state, event.index) };

    case 'FLAG': {
      const id = event.questionId ?? currentQuestion(state)?.id;
      if (!id) return state;
      const flagged = state.flagged.includes(id)
        ? state.flagged.filter((f) => f !== id)
        : [...state.flagged, id];
      return { ...state, flagged };
    }

    case 'TICK': {
      if (state.remainingSec === null) return state;
      const remainingSec = Math.max(0, state.remainingSec - (event.seconds ?? 1));
      const ticked = { ...state, remainingSec };
      return remainingSec === 0 ? submit(ticked, true) : ticked;
    }

    case 'SUBMIT':
      return submit(state, false);

    default:
      return state;
  }
}
