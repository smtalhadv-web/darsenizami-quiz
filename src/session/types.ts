/**
 * Session engine types.
 *
 * This module and its siblings contain NO React and NO I/O (RULES R4.1, R4.2).
 * The engine is a pure state machine: events in, state out. Time arrives as
 * TICK events from the caller; the engine owns no timer.
 */

export type Locale = 'ar' | 'ur' | 'en';

/** Text that may exist in any subset of the three locales. */
export type LocalisedText = Partial<Record<Locale, string>>;

export interface QuestionOption {
  id: string;
  text: LocalisedText;
}

/**
 * Provenance of a question. The student-facing app must surface this.
 *
 *  - 'authored'        written by hand and verified against the book
 *  - 'drafted'         produced by the ingestion pipeline, then human-approved
 *  - 'demo-unverified' placeholder for prototype demonstration only.
 *                      NEVER presented as verified book content (RULES R1.4, R2.1).
 */
export type QuestionOrigin = 'authored' | 'drafted' | 'demo-unverified';

export interface SourceRef {
  /** Catalogue book id, e.g. "dn-nahw-meer". */
  bookId: string;
  page?: number;
  section?: string;
  /** Short cited excerpt from the book, shown as the quoted matn. */
  quote?: string;
}

export interface Question {
  id: string;
  bookId: string;
  /** The passage quoted from the book, set apart from our own wording. */
  matn?: LocalisedText;
  stem: LocalisedText;
  options: QuestionOption[];
  correctOptionId: string;
  explanation: LocalisedText;
  source: SourceRef;
  origin: QuestionOrigin;
}

export type Mode = 'practice' | 'exam-strict' | 'exam-board';

export type Feedback = 'immediate' | 'on-submit';

export interface SessionConfig {
  mode: Mode;
  questions: Question[];
  /** null means untimed. */
  timeLimitSec: number | null;
  /** Whether the student may return to an earlier question. */
  allowRevisit: boolean;
  feedback: Feedback;
  /** 0..1 */
  passMark: number;
}

/** The three modes differ only by configuration — never by code path (D7). */
export const MODE_PRESETS: Record<
  Mode,
  Pick<SessionConfig, 'timeLimitSec' | 'allowRevisit' | 'feedback'>
> = {
  practice: { timeLimitSec: null, allowRevisit: true, feedback: 'immediate' },
  'exam-strict': { timeLimitSec: 20 * 60, allowRevisit: false, feedback: 'on-submit' },
  'exam-board': { timeLimitSec: 25 * 60, allowRevisit: true, feedback: 'on-submit' },
};

export type Phase = 'active' | 'submitted';

export interface Answer {
  questionId: string;
  optionId: string;
}

export interface SessionState {
  config: SessionConfig;
  phase: Phase;
  index: number;
  /** questionId -> chosen optionId */
  answers: Record<string, string>;
  /** questionIds the student flagged for review */
  flagged: string[];
  /** null when untimed */
  remainingSec: number | null;
  result: Result | null;
}

export interface QuestionResult {
  question: Question;
  chosenOptionId: string | null;
  correct: boolean;
  answered: boolean;
}

export interface Result {
  total: number;
  answered: number;
  correct: number;
  /** 0..1, computed over total questions, not over answered ones. */
  score: number;
  passed: boolean;
  /** true when the paper was submitted because the clock ran out */
  autoSubmitted: boolean;
  questions: QuestionResult[];
}

export type SessionEvent =
  | { type: 'ANSWER'; optionId: string }
  | { type: 'NEXT' }
  | { type: 'PREV' }
  | { type: 'GOTO'; index: number }
  | { type: 'FLAG'; questionId?: string }
  | { type: 'TICK'; seconds?: number }
  | { type: 'SUBMIT' };
