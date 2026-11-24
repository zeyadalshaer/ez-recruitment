import { getCollection, type CollectionEntry } from 'astro:content';
import site from '../data/site.json';
import nav from '../data/navigation.json';
import pages from '../data/pages.json';
import { data, defaultLocale, type Locale } from './i18n';

export { site, nav, pages };

/** All translated site text for one language (falls back to English per missing key). */
export function T(locale: Locale = defaultLocale) {
  return {
    site: data<typeof site>('site', locale),
    nav: data<typeof nav>('navigation', locale),
    pages: data<typeof pages>('pages', locale),
    home: data<typeof import('../data/home.json')>('home', locale),
    about: data<typeof import('../data/about.json')>('about', locale),
    contact: data<typeof import('../data/contact.json')>('contact', locale),
    partner: data<typeof import('../data/partner.json')>('partner', locale),
    ui: data<Record<string, any>>('ui', locale),
  };
}

/** Entries of a content collection for one language. Translations live in a folder named after the language. */
export async function getLocalized<C extends 'services' | 'industries' | 'process' | 'categories' | 'pages'>(name: C, locale: Locale = defaultLocale) {
  const all = await getCollection(name);
  const own = all.filter((e) => (locale === defaultLocale ? !e.id.includes('/') : e.id.startsWith(locale + '/')));
  const bySlug = new Map(own.map((e) => [entrySlug(e), e]));
  // Fall back to English for anything not translated yet.
  for (const e of all.filter((e) => !e.id.includes('/'))) if (!bySlug.has(e.id)) bySlug.set(e.id, e);
  return [...bySlug.values()];
}

/** The language-independent slug of an entry (English and translated versions share it). */
export const entrySlug = (e: { id: string }) => e.id.split('/').pop() as string;

export type Post = CollectionEntry<'blog'>;

export function readingTime(text = ''): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function formatDate(date: Date, locale: Locale = defaultLocale): string {
  return date.toLocaleDateString(locale === 'en' ? 'en-US' : locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export const byOrder = <T extends { data: { order: number } }>(a: T, b: T) => a.data.order - b.data.order;

/** Published articles, newest first. Unpublished articles never reach the website. */
export async function getPosts(locale: Locale = defaultLocale): Promise<Post[]> {
  const posts = await getCollection('blog', ({ data, id }) => data.published && (locale === defaultLocale ? !id.includes('/') : id.startsWith(locale + '/')));
  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export async function getCategories(locale: Locale = defaultLocale) {
  const [cats, posts] = await Promise.all([getLocalized('categories', locale), getPosts(locale)]);
  return cats
    .map((c) => ({ id: entrySlug(c), title: c.data.title, description: c.data.description, count: posts.filter((p) => p.data.category === entrySlug(c)).length }))
    .filter((c) => c.count > 0)
    .sort((a, b) => a.title.localeCompare(b.title, locale));
}

export async function categoryTitle(id: string, locale: Locale = defaultLocale): Promise<string> {
  const cats = await getLocalized('categories', locale);
  return cats.find((c) => entrySlug(c) === id)?.data.title ?? id;
}

export function getRelated(current: Post, all: Post[], limit = 3): Post[] {
  const others = all.filter((p) => p.id !== current.id);
  const same = others.filter((p) => p.data.category === current.data.category);
  const rest = others.filter((p) => p.data.category !== current.data.category);
  return [...same, ...rest].slice(0, limit);
}

export const absUrl = (path: string) => new URL(path, site.url).href;
