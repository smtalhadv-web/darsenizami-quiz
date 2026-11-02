import type { LocalisedText } from '../session/types';

export interface CatalogueBook {
  id: string;
  slug: string;
  collection: string;
  year: string;
  stream: 'banin' | 'banat';
  kind: 'matn' | 'sharh';
  title: LocalisedText;
  author?: string;
  sourceUrl: string;
  pdfUrl?: string;
  language: 'ar' | 'ur';
  questionCount: number;
  hasDemoQuestions: boolean;
}

export interface CatalogueYear {
  id: string;
  stream: 'banin' | 'banat';
  ordinal: number;
  siteCount: number;
  name: LocalisedText;
  collections: { matn: string; sharh: string };
  imported: { matn: boolean; sharh: boolean };
  bookCount: number;
  questionCount: number;
}

export interface CatalogueStream {
  id: 'banin' | 'banat';
  name: LocalisedText;
  years: string[];
}

export interface Catalogue {
  generatedAt: string;
  source: string;
  streams: CatalogueStream[];
  years: CatalogueYear[];
  books: CatalogueBook[];
  stats: {
    collectionsImported: number;
    collectionsTotal: number;
    books: number;
    questions: number;
  };
}

export function yearsOf(cat: Catalogue, stream: 'banin' | 'banat'): CatalogueYear[] {
  return cat.years.filter((y) => y.stream === stream).sort((a, b) => a.ordinal - b.ordinal);
}

export function year(cat: Catalogue, id: string): CatalogueYear | undefined {
  return cat.years.find((y) => y.id === id);
}

export function booksOf(cat: Catalogue, collectionId: string): CatalogueBook[] {
  return cat.books.filter((b) => b.collection === collectionId);
}

export function book(cat: Catalogue, id: string): CatalogueBook | undefined {
  return cat.books.find((b) => b.id === id);
}

export function isImported(y: CatalogueYear, kind: 'matn' | 'sharh'): boolean {
  return y.imported[kind];
}
