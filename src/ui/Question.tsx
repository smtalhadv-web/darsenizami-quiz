import { useEffect, useReducer, useState } from 'react';
import {
  createSession,
  reduce,
  currentQuestion,
  isFeedbackVisible,
  unansweredQuestions,
} from '../session/engine';
import { MODE_PRESETS, type Locale, type Mode, type Question } from '../session/types';
import { text, type T } from '../i18n';
import type { CatalogueBook } from '../catalogue';
import { Result } from './Result';

const OPTION_LABELS: Record<Locale, string[]> = {
  ar: ['ا', 'ب', 'ج', 'د', 'ه', 'و'],
  ur: ['ا', 'ب', 'ج', 'د', 'ہ', 'و'],
  en: ['A', 'B', 'C', 'D', 'E', 'F'],
};

function clock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

interface Props {
  book: CatalogueBook;
  questions: Question[];
  mode: Mode;
  passMark: number;
  locale: Locale;
  t: T;
  onExit: () => void;
  onRestart: () => void;
}

export function QuestionScreen({
  book, questions, mode, passMark, locale, t, onExit, onRestart,
}: Props) {
  const [state, dispatch] = useReducer(
    reduce,
    createSession({ mode, questions, passMark, ...MODE_PRESETS[mode] }),
  );
  const [confirming, setConfirming] = useState(false);

  // The engine owns no timer; the clock is driven from here (RULES R4.2).
  useEffect(() => {
    if (state.remainingSec === null || state.phase === 'submitted') return;
    const id = setInterval(() => dispatch({ type: 'TICK', seconds: 1 }), 1000);
    return () => clearInterval(id);
  }, [state.remainingSec === null, state.phase]);

  if (state.phase === 'submitted' && state.result) {
    return (
      <Result
        book={book} result={state.result} mode={mode}
        locale={locale} t={t} onExit={onExit} onRestart={onRestart}
      />
    );
  }

  const q = currentQuestion(state);
  if (!q) return <p className="muted">{t('comingSoon')}</p>;

  const showFeedback = isFeedbackVisible(state);
  const chosen = state.answers[q.id];
  const labels = OPTION_LABELS[locale];
  const total = questions.length;
  const blanks = unansweredQuestions(state).length;
  const lowTime = state.remainingSec !== null && state.remainingSec <= 120;

  // Review-and-confirm step, board mode only (strict auto-advances to submit).
  if (confirming) {
    return (
      <section>
        <h1>{t('reviewBeforeSubmit')}</h1>
        <p className="muted">
          <span className="num">{total - blanks}</span> {t('answered')} ·{' '}
          <span className="num">{blanks}</span> {t('unanswered')}
        </p>
        <div className="revgrid" style={{ marginBlock: 'var(--s4)' }}>
          {questions.map((qq, i) => (
            <button
              key={qq.id}
              className={
                state.flagged.includes(qq.id) ? 'flag' : qq.id in state.answers ? 'done' : ''
              }
              aria-label={`${t('question')} ${i + 1}`}
              onClick={() => { setConfirming(false); dispatch({ type: 'GOTO', index: i }); }}
            >
              <span className="num">{i + 1}</span>
            </button>
          ))}
        </div>
        {blanks > 0 && (
          <div className="notice warn">
            <span className="num">{blanks}</span> {t('unansweredWarning')}
          </div>
        )}
        <div className="qactions">
          <button className="btn secondary" onClick={() => setConfirming(false)}>
            {t('back')}
          </button>
          <button className="btn" onClick={() => dispatch({ type: 'SUBMIT' })}>
            {t('submitPaper')}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="qbar">
        <button className="link-btn" onClick={onExit}>
          <span className="chev">←</span> {text(book.title, locale)}
        </button>
        <span className="muted num">
          {state.index + 1} / {total}
        </span>
        {state.remainingSec !== null && (
          <span className={`timer num${lowTime ? ' low' : ''}`} role="timer">
            {clock(state.remainingSec)}
          </span>
        )}
      </div>

      <div className="progress">
        <i style={{ inlineSize: `${((state.index + 1) / total) * 100}%` }} />
      </div>

      {q.origin === 'demo-unverified' && (
        <div className="notice warn">
          <strong>{t('demoBanner')}</strong>
          {t('demoExplain')}
        </div>
      )}

      {q.matn && <div className="matn">{text(q.matn, 'ar')}</div>}

      <p className={`stem ${locale}`}>{text(q.stem, locale)}</p>

      <div className="options" role="group">
        {q.options.map((opt, i) => {
          let cls = 'option';
          if (showFeedback) {
            if (opt.id === q.correctOptionId) cls += ' correct';
            else if (opt.id === chosen) cls += ' incorrect';
          }
          return (
            <button
              key={opt.id}
              className={cls}
              aria-pressed={chosen === opt.id}
              disabled={showFeedback}
              onClick={() => dispatch({ type: 'ANSWER', optionId: opt.id })}
            >
              <span className="lab">{labels[i] ?? i + 1}</span>
              <span>{text(opt.text, locale)}</span>
              {showFeedback && opt.id === q.correctOptionId && (
                <span className="mark">✓ {t('correct')}</span>
              )}
              {showFeedback && opt.id === chosen && opt.id !== q.correctOptionId && (
                <span className="mark">✕ {t('incorrect')}</span>
              )}
            </button>
          );
        })}
      </div>

      {showFeedback && (
        <div className="feedback">
          <strong>{t('explanation')}</strong>
          <p style={{ margin: 'var(--s2) 0 0' }}>{text(q.explanation, locale)}</p>
          <p className="src">
            {t('source')}: {text(book.title, locale)}
            {q.source.page ? ` · p. ${q.source.page}` : ''}
            {q.source.section && q.source.section !== '—' ? ` · ${q.source.section}` : ''}
            {q.origin === 'demo-unverified' && ` · ${t('unverified')}`}
            {' · '}
            <a href={book.sourceUrl} target="_blank" rel="noreferrer">{t('viewBook')}</a>
          </p>
        </div>
      )}

      <div className="qactions">
        {/* Strict mode renders no back control at all — not a disabled one. */}
        {state.config.allowRevisit ? (
          <button
            className="btn secondary"
            disabled={state.index === 0}
            onClick={() => dispatch({ type: 'PREV' })}
          >
            {t('previous')}
          </button>
        ) : <span />}

        <div className="row">
          {state.config.allowRevisit && mode !== 'practice' && (
            <button
              className="btn secondary"
              aria-pressed={state.flagged.includes(q.id)}
              onClick={() => dispatch({ type: 'FLAG' })}
            >
              ⚑ {state.flagged.includes(q.id) ? t('flagged') : t('flag')}
            </button>
          )}
          {state.index < total - 1 ? (
            <button className="btn" onClick={() => dispatch({ type: 'NEXT' })}>
              {t('next')}
            </button>
          ) : (
            <button
              className="btn"
              onClick={() =>
                mode === 'exam-board' ? setConfirming(true) : dispatch({ type: 'SUBMIT' })
              }
            >
              {t('submit')}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
