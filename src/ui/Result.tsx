import { useEffect } from 'react';
import type { Locale, Mode, Result as ResultData } from '../session/types';
import { text, type T } from '../i18n';
import type { CatalogueBook } from '../catalogue';
import { recordAttempt } from '../progress';

interface Props {
  book: CatalogueBook;
  result: ResultData;
  mode: Mode;
  locale: Locale;
  t: T;
  onExit: () => void;
  onRestart: () => void;
}

export function Result({ book, result, mode, locale, t, onExit, onRestart }: Props) {
  useEffect(() => {
    recordAttempt({
      bookId: book.id,
      mode,
      score: result.score,
      correct: result.correct,
      total: result.total,
      passed: result.passed,
      at: new Date().toISOString(),
    });
    // record once per completed paper
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pct = Math.round(result.score * 100);

  return (
    <section>
      <h1>{t('result')}</h1>

      {result.autoSubmitted && <div className="notice warn">{t('timeUp')}</div>}

      <div className="spread" style={{ marginBlock: 'var(--s4)' }}>
        <div>
          <div className="score num">
            {result.correct} / {result.total}
          </div>
          <div className={`verdict ${result.passed ? 'pass' : 'fail'}`}>
            <span className="num">{pct}%</span> — {result.passed ? t('passed') : t('failed')}
          </div>
        </div>
      </div>

      <h2>{t('reviewAnswers')}</h2>

      {result.questions.map((r, i) => {
        const chosen = r.question.options.find((o) => o.id === r.chosenOptionId);
        const right = r.question.options.find((o) => o.id === r.question.correctOptionId);
        return (
          <div key={r.question.id} className={`resultcard ${r.correct ? 'right' : 'wrong'}`}>
            <div className="muted">
              {t('question')} <span className="num">{i + 1}</span>
              {r.question.origin === 'demo-unverified' && (
                <> · <span className="pill warn">{t('unverified')}</span></>
              )}
            </div>

            {r.question.matn && (
              <div className="matn" style={{ fontSize: '1.1rem', marginBlock: 'var(--s3)' }}>
                {text(r.question.matn, 'ar')}
              </div>
            )}

            <p style={{ margin: 'var(--s2) 0' }}>{text(r.question.stem, locale)}</p>

            <p className="muted" style={{ margin: 0 }}>
              {t('yourAnswer')}:{' '}
              {r.answered ? (
                <strong style={{ color: r.correct ? 'var(--correct)' : 'var(--incorrect)' }}>
                  {text(chosen?.text, locale)} {r.correct ? '✓' : '✕'}
                </strong>
              ) : (
                <em>{t('notAnswered')}</em>
              )}
            </p>

            {!r.correct && (
              <p className="muted" style={{ margin: 'var(--s1) 0 0' }}>
                {t('correctAnswer')}:{' '}
                <strong style={{ color: 'var(--correct)' }}>{text(right?.text, locale)}</strong>
              </p>
            )}

            <p style={{ marginBlock: 'var(--s3) var(--s1)' }}>
              {text(r.question.explanation, locale)}
            </p>

            <p className="muted" style={{ margin: 0, fontSize: '.82rem' }}>
              {t('source')}: {text(book.title, locale)}
              {r.question.source.page ? ` · p. ${r.question.source.page}` : ''}
              {' · '}
              <a href={book.sourceUrl} target="_blank" rel="noreferrer">{t('viewBook')}</a>
            </p>
          </div>
        );
      })}

      <div className="qactions">
        <button className="btn secondary" onClick={onExit}>{t('backToBook')}</button>
        <button className="btn" onClick={onRestart}>{t('tryAgain')}</button>
      </div>
    </section>
  );
}
