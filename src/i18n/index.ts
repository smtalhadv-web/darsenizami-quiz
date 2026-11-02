import type { Locale, LocalisedText } from '../session/types';

export const LOCALES: Locale[] = ['ar', 'ur', 'en'];

export const LOCALE_LABEL: Record<Locale, string> = {
  ar: 'العربية',
  ur: 'اردو',
  en: 'English',
};

export const DIRECTION: Record<Locale, 'rtl' | 'ltr'> = {
  ar: 'rtl',
  ur: 'rtl',
  en: 'ltr',
};

/**
 * Resolve localised content. Falls back through the other locales rather than
 * rendering nothing — an Arabic matn question stays Arabic when the UI is
 * English, which is intended (RULES R5.5).
 */
export function text(value: LocalisedText | undefined, locale: Locale): string {
  if (!value) return '';
  return value[locale] ?? value.en ?? value.ar ?? value.ur ?? '';
}

type Dict = Record<string, string>;

const en: Dict = {
  appName: 'Nisab',
  tagline: 'Dars-e-Nizami practice & examination',
  banin: 'Banin',
  banat: 'Banat',
  books: 'books',
  questions: 'questions',
  noQuestions: 'No questions yet',
  notImported: 'Catalogue not yet imported',
  notImportedHelp: 'Run the catalogue scraper to load this year’s books.',
  back: 'Back',
  matn: 'Mutun (textbooks)',
  sharh: 'Shuroohat (commentaries)',
  chooseMode: 'Choose how to study',
  practice: 'Practice',
  practiceDesc: 'Untimed · answers shown as you go',
  examStrict: 'Examination (Strict)',
  examStrictDesc: 'Timed · no going back · results at the end',
  examBoard: 'Examination (Board)',
  examBoardDesc: 'Timed · flag and return · results at the end',
  start: 'Start',
  passMark: 'Pass mark',
  previousAttempts: 'Previous attempts on this device',
  noAttempts: 'No attempts yet',
  question: 'Question',
  of: 'of',
  next: 'Next',
  previous: 'Previous',
  flag: 'Flag',
  flagged: 'Flagged',
  submit: 'Submit',
  submitPaper: 'Submit paper',
  reviewBeforeSubmit: 'Review before submitting',
  answered: 'Answered',
  unanswered: 'Unanswered',
  unansweredWarning: 'question(s) left blank. Blanks are marked incorrect.',
  correct: 'Correct',
  incorrect: 'Incorrect',
  notAnswered: 'Not answered',
  yourAnswer: 'Your answer',
  correctAnswer: 'Correct answer',
  explanation: 'Explanation',
  source: 'Source',
  viewBook: 'View book',
  result: 'Result',
  passed: 'Passed',
  failed: 'Below the pass mark',
  score: 'Score',
  timeUp: 'Time expired — the paper was submitted automatically.',
  reviewAnswers: 'Review every question',
  tryAgain: 'Start again',
  backToBook: 'Back to book',
  demoBanner: 'Demo questions — not yet verified against the book',
  demoExplain:
    'These placeholder questions demonstrate the app. They have NOT been checked against the printed text and carry no page references. Do not rely on them for study.',
  unverified: 'Unverified',
  comingSoon: 'Questions for this book have not been published yet.',
  coverage: 'Coverage',
  collectionsImported: 'collections imported',
};

const ur: Dict = {
  appName: 'نصاب',
  tagline: 'درس نظامی مشق و امتحان',
  banin: 'بنین',
  banat: 'بنات',
  books: 'کتب',
  questions: 'سوالات',
  noQuestions: 'ابی کوئی سوال نہیں',
  notImported: 'فہرست ابھی شامل نہیں',
  notImportedHelp: 'اس درجہ کی کتب لوڈ کرنے کے لیے اسکریپٹ چلائیں۔',
  back: 'واپس',
  matn: 'متون',
  sharh: 'شروحات',
  chooseMode: 'طریقہ منتخب کریں',
  practice: 'مشق',
  practiceDesc: 'بغیر وقت کے · جواب فوراً ظاہر',
  examStrict: 'امتحان (سخت)',
  examStrictDesc: 'وقت مقرر · واپسی نہیں · نتیجہ آخر میں',
  examBoard: 'امتحان (بورڈ)',
  examBoardDesc: 'وقت مقرر · نشان لگا کر واپسی · نتیجہ آخر میں',
  start: 'شروع',
  passMark: 'کامیابی کے نمبر',
  previousAttempts: 'پچھلی کوششیں',
  noAttempts: 'ابی کوئی کوشش نہیں',
  question: 'سوال',
  of: 'میں سے',
  next: 'آگے',
  previous: 'پیچھے',
  flag: 'نشان',
  flagged: 'نشان زد',
  submit: 'جمع کریں',
  submitPaper: 'پرچہ جمع کریں',
  reviewBeforeSubmit: 'جمع کرنے سے پہلے جائزہ',
  answered: 'جواب دیے گئے',
  unanswered: 'خالی',
  unansweredWarning: 'سوال خالی ہیں۔ خالی سوال غلط شمار ہوں گے۔',
  correct: 'درست',
  incorrect: 'غلط',
  notAnswered: 'جواب نہیں دیا',
  yourAnswer: 'آپ کا جواب',
  correctAnswer: 'درست جواب',
  explanation: 'وضاحت',
  source: 'حوالہ',
  viewBook: 'کتاب دیکھیں',
  result: 'نتیجہ',
  passed: 'کامیاب',
  failed: 'کامیابی کے نمبروں سے کم',
  score: 'نمبر',
  timeUp: 'وقت ختم ہو گیا — پرچہ خودکار طور پر جمع ہو گیا۔',
  reviewAnswers: 'تمام سوالات کا جائزہ',
  tryAgain: 'دوبارہ شروع',
  backToBook: 'کتاب پر واپس',
  demoBanner: 'نمونے کے سوالات — کتاب سے تصدیق شدہ نہیں',
  demoExplain:
    'یہ سوالات صرف ایپ کا طریقہ کار دکھانے کے لیے ہیں۔ ان کی کتاب سے تصدیق نہیں کی گئی۔ ان پر اعتماد نہ کریں۔',
  unverified: 'غیر مصدقہ',
  comingSoon: 'اس کتاب کے سوالات ابھی شائع نہیں ہوئے۔',
  coverage: 'احاطہ',
  collectionsImported: 'مجموعے شامل',
};

const ar: Dict = {
  ...en,
  appName: 'نصاب',
  tagline: 'تدریب وامتحان درس نظامی',
  banin: 'بنين',
  banat: 'بنات',
  books: 'كتب',
  questions: 'أسئلة',
  noQuestions: 'لا توجد أسئلة بعد',
  matn: 'المتون',
  sharh: 'الشروحات',
  practice: 'تدريب',
  examStrict: 'امتحان (صارم)',
  examBoard: 'امتحان (مجلس)',
  start: 'ابدأ',
  question: 'سؤال',
  of: 'من',
  next: 'التالي',
  previous: 'السابق',
  flag: 'علامة',
  submit: 'إرسال',
  correct: 'صحيح',
  incorrect: 'خطأ',
  explanation: 'الشرح',
  source: 'المصدر',
  result: 'النتيجة',
  passed: 'ناجح',
  score: 'الدرجة',
  back: 'رجوع',
};

const DICTS: Record<Locale, Dict> = { en, ur, ar };

export function makeT(locale: Locale) {
  const dict = DICTS[locale];
  return (key: keyof typeof en): string => dict[key] ?? en[key] ?? key;
}

export type T = ReturnType<typeof makeT>;
