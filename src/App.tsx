import { useEffect, useMemo, useState } from 'react';
import type { Catalogue, CatalogueBook, CatalogueYear } from './catalogue';
import { booksOf, book as findBook, year as findYear, yearsOf } from './catalogue';
import { DIRECTION, LOCALES, LOCALE_LABEL, makeT, text } from './i18n';
import type { Locale, Mode, Question } from './session/types';
import { attemptsFor, getLocale, setLocale as persistLocale } from './progress';
import { QuestionScreen } from './ui/Question';

const PASS_MARK = 0.6;

type View =
  | { name: 'home' }
  | { name: 'year'; yearId: string }
  | { name: 'book'; bookId: string }
  | { name: 'run'; bookId: string; mode: Mode; nonce: number };

export default function App() {
  const [locale, setLocale] = useState<Locale>(() => getLocale() ?? 'ur');
  const [cat, setCat] = useState<Catalogue | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [view, setView] = useState<View>({ name: 'home' });
  const [error, setError] = useState<string | null>(null);

  const t = useMemo(() => makeT(locale), [locale]);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = DIRECTION[locale];
    document.documentElement.dataset.locale = locale;
    persistLocale(locale);
  }, [locale]);

  useEffect(() => {
    const base = import.meta.env.BASE_URL;
    Promise.all([
      fetch(`${base}catalogue.json`).then((r) => r.json()),
      fetch(`${base}questions.json`).then((r) => r.json()),
    ])
      .then(([c, q]) => { setCat(c); setQuestions(q); })
      .catch(() => setError('Could not load the catalogue.'));
  }, []);

  if (error) return <div className="app"><p className="notice warn">{error}</p></div>;
  if (!cat) return <div className="app"><p className="muted">…</p></div>;

  const questionsFor = (bookId: string) => questions.filter((q) => q.bookId === bookId);

  return (
    <div className="app">
      <header className="topbar">
        <button
          className="brandmark"
          onClick={() => setView({ name: 'home' })}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <strong>{t('appName')}</strong>
          <span>{t('tagline')}</span>
        </button>
        <div className="locales">
          {LOCALES.map((l) => (
            <button
              key={l}
              aria-pressed={locale === l}
              onClick={() => setLocale(l)}
              lang={l}
            >
              {LOCALE_LABEL[l]}
            </button>
          ))}
        </div>
      </header>

      {view.name === 'home' && (
        <Home cat={cat} locale={locale} t={t} onPick={(y) => setView({ name: 'year', yearId: y })} />
      )}

      {view.name === 'year' && (
        <YearView
          cat={cat} yearId={view.yearId} locale={locale} t={t}
          onBack={() => setView({ name: 'home' })}
          onPick={(b) => setView({ name: 'book', bookId: b })}
        />
      )}

      {view.name === 'book' && (
        <BookView
          cat={cat} bookId={view.bookId} locale={locale} t={t}
          count={questionsFor(view.bookId).length}
          onBack={(yearId) => setView({ name: 'year', yearId })}
          onStart={(mode) => setView({ name: 'run', bookId: view.bookId, mode, nonce: Date.now() })}
        />
      )}

      {view.name === 'run' && (() => {
        const b = findBook(cat, view.bookId)!;
        return (
          <QuestionScreen
            key={view.nonce}
            book={b}
            questions={questionsFor(view.bookId)}
            mode={view.mode}
            passMark={PASS_MARK}
            locale={locale}
            t={t}
            onExit={() => setView({ name: 'book', bookId: view.bookId })}
            onRestart={() =>
              setView({ name: 'run', bookId: view.bookId, mode: view.mode, nonce: Date.now() })
            }
          />
        );
      })()}

      <footer className="muted" style={{ marginBlockStart: 'var(--s7)', fontSize: '.78rem' }}>
        {t('coverage')}: <span className="num">{cat.stats.collectionsImported}</span>/
        <span className="num">{cat.stats.collectionsTotal}</span> {t('collectionsImported')} ·{' '}
        <span className="num">{cat.stats.books}</span> {t('books')} ·{' '}
        <span className="num">{cat.stats.questions}</span> {t('questions')} ·{' '}
        <a href={cat.source} target="_blank" rel="noreferrer">darsenizami.net</a>
      </footer>
    </div>
  );
}

function Home({
  cat, locale, t, onPick,
}: { cat: Catalogue; locale: Locale; t: ReturnType<typeof makeT>; onPick: (y: string) => void }) {
  return (
    <>
      {cat.stats.questions > 0 && (
        <div className="notice warn">
          <strong>{t('demoBanner')}</strong>
          {t('demoExplain')}
        </div>
      )}
      {cat.streams.map((s) => (
        <section key={s.id}>
          <h2>{text(s.name, locale)}</h2>
          <div className="grid">
            {yearsOf(cat, s.id).map((y) => {
              const imported = y.imported.matn || y.imported.sharh;
              return (
                <button key={y.id} className="card" onClick={() => onPick(y.id)}>
                  <span className="ttl">{text(y.name, locale)}</span>
                  <span className="sub num">
                    {imported ? y.bookCount : y.siteCount} {t('books')}
                  </span>
                  <span className={`pill${y.questionCount > 0 ? ' has' : ''}`}>
                    {y.questionCount > 0
                      ? <><span className="num">{y.questionCount}</span> {t('questions')}</>
                      : imported ? t('noQuestions') : t('notImported')}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}

function YearView({
  cat, yearId, locale, t, onBack, onPick,
}: {
  cat: Catalogue; yearId: string; locale: Locale; t: ReturnType<typeof makeT>;
  onBack: () => void; onPick: (b: string) => void;
}) {
  const y = findYear(cat, yearId) as CatalogueYear;
  const [kind, setKind] = useState<'matn' | 'sharh'>('matn');
  const collectionId = y.collections[kind];
  const books = booksOf(cat, collectionId);

  return (
    <section>
      <button className="link-btn" onClick={onBack}>
        <span className="chev">←</span> {t('back')}
      </button>
      <h1>{text(y.name, locale)}</h1>

      <div className="tabs" role="tablist">
        {(['matn', 'sharh'] as const).map((k) => (
          <button key={k} role="tab" aria-selected={kind === k} onClick={() => setKind(k)}>
            {t(k)}
          </button>
        ))}
      </div>

      {!y.imported[kind] ? (
        <div className="notice">
          <strong>{t('notImported')}</strong>
          {t('notImportedHelp')} <code>npm run scrape</code>
        </div>
      ) : books.length === 0 ? (
        <p className="muted">{t('noQuestions')}</p>
      ) : (
        <div className="booklist">
          {books.map((b) => (
            <button
              key={b.id}
              className="bookrow"
              disabled={b.questionCount === 0}
              onClick={() => onPick(b.id)}
            >
              <span>
                <span style={{ fontWeight: 600 }}>{text(b.title, 'en')}</span>
                {b.title.ur && <span className="t2 ur"> · {b.title.ur}</span>}
                {b.author && <div className="t2">✍️ {b.author}</div>}
              </span>
              <span className={`pill${b.questionCount > 0 ? ' has' : ''}`}>
                {b.questionCount > 0
                  ? <><span className="num">{b.questionCount}</span> {t('questions')}</>
                  : t('noQuestions')}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function BookView({
  cat, bookId, t, count, onBack, onStart,
}: {
  cat: Catalogue; bookId: string; locale: Locale; t: ReturnType<typeof makeT>;
  count: number; onBack: (yearId: string) => void; onStart: (m: Mode) => void;
}) {
  const b = findBook(cat, bookId) as CatalogueBook;
  const attempts = attemptsFor(bookId);

  const modes: { mode: Mode; title: string; desc: string }[] = [
    { mode: 'practice', title: t('practice'), desc: t('practiceDesc') },
    { mode: 'exam-strict', title: t('examStrict'), desc: t('examStrictDesc') },
    { mode: 'exam-board', title: t('examBoard'), desc: t('examBoardDesc') },
  ];

  return (
    <section>
      <button className="link-btn" onClick={() => onBack(b.year)}>
        <span className="chev">←</span> {t('back')}
      </button>
      <h1>{text(b.title, 'en')}</h1>
      {b.title.ur && <p className="ur" style={{ margin: 0, fontSize: '1.1rem' }}>{b.title.ur}</p>}
      {b.author && <p className="muted">✍️ {b.author}</p>}

      {b.hasDemoQuestions && (
        <div className="notice warn">
          <strong>{t('demoBanner')}</strong>
          {t('demoExplain')}
        </div>
      )}

      <p className="muted">
        <span className="num">{count}</span> {t('questions')} · {t('passMark')}{' '}
        <span className="num">{Math.round(PASS_MARK * 100)}%</span>
      </p>

      <h2>{t('chooseMode')}</h2>
      <div className="grid">
        {modes.map((m) => (
          <button
            key={m.mode}
            className="card"
            disabled={count === 0}
            onClick={() => onStart(m.mode)}
          >
            <span className="ttl">{m.title}</span>
            <span className="sub">{m.desc}</span>
          </button>
        ))}
      </div>

      <h2>{t('previousAttempts')}</h2>
      {attempts.length === 0 ? (
        <p className="muted">{t('noAttempts')}</p>
      ) : (
        <div className="booklist">
          {attempts.slice(0, 8).map((a, i) => (
            <div key={i} className="bookrow" style={{ cursor: 'default' }}>
              <span>{t(a.mode === 'practice' ? 'practice' : a.mode === 'exam-strict' ? 'examStrict' : 'examBoard')}</span>
              <span className={`pill${a.passed ? ' has' : ''}`}>
                <span className="num">{a.correct}/{a.total}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
