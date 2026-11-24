/**
 * Language support.
 *
 * English lives at the site root (unchanged URLs). Other languages live under /ar/, /pl/, /ro/.
 * A language is only visible to visitors (selector, hreflang, sitemap) once it appears in
 * `publishedLocales`. Translations stay hidden until a person has reviewed them.
 */
import config from './locales.json';

export const locales = ['en', 'ar', 'pl', 'ro'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

/**
 * Languages are controlled in src/lib/locales.json:
 *  - "published": live languages (language selector, hreflang, sitemap, indexed by search engines).
 *  - "review":    translated but awaiting human review. The pages are built so they can be checked at
 *                 their web address, but they are hidden from the selector, hreflang and sitemap and
 *                 marked noindex. Move a language to "published" only after it has been reviewed.
 */
export const publishedLocales = config.published as Locale[];
export const reviewLocales = config.review as Locale[];
/** Non-default languages that get pages built. */
export const builtLocales = [...publishedLocales, ...reviewLocales].filter((l) => l !== defaultLocale) as Locale[];
export const isReviewLocale = (l: Locale) => reviewLocales.includes(l);

export const localeMeta: Record<Locale, { label: string; native: string; dir: 'ltr' | 'rtl'; htmlLang: string; og: string }> = {
  en: { label: 'English', native: 'English', dir: 'ltr', htmlLang: 'en', og: 'en_US' },
  ar: { label: 'Arabic', native: 'العربية', dir: 'rtl', htmlLang: 'ar', og: 'ar_AR' },
  pl: { label: 'Polish', native: 'Polski', dir: 'ltr', htmlLang: 'pl', og: 'pl_PL' },
  ro: { label: 'Romanian', native: 'Română', dir: 'ltr', htmlLang: 'ro', og: 'ro_RO' },
};

export function getLocale(pathname: string): Locale {
  const first = pathname.split('/')[1];
  return (locales as readonly string[]).includes(first) && first !== defaultLocale ? (first as Locale) : defaultLocale;
}

/** Path without any language prefix, always starting and ending with "/". */
export function stripLocale(pathname: string): string {
  const loc = getLocale(pathname);
  if (loc === defaultLocale) return pathname;
  const rest = pathname.slice(loc.length + 1);
  return rest === '' ? '/' : rest;
}

/** Prefix an internal path with the language. Anchors and external links are left alone. */
export function localizePath(path: string, locale: Locale): string {
  if (!path.startsWith('/') || path.startsWith('//') || locale === defaultLocale) return path;
  return path === '/' ? `/${locale}/` : `/${locale}${path}`;
}

// ---------------------------------------------------------------------------------------------
// Translated text. English lives in src/data/<name>.json; a translation lives in
// src/data/<locale>/<name>.json. Anything missing from a translation falls back to English.
// ---------------------------------------------------------------------------------------------
const files = import.meta.glob('../data/**/*.json', { eager: true, import: 'default' }) as Record<string, any>;

function merge(base: any, over: any): any {
  if (over === undefined) return base;
  if (Array.isArray(base) || Array.isArray(over) || typeof base !== 'object' || typeof over !== 'object' || !base || !over) return over;
  const out: Record<string, any> = { ...base };
  for (const k of Object.keys(over)) out[k] = merge(base[k], over[k]);
  return out;
}

export function data<T = any>(name: string, locale: Locale = defaultLocale): T {
  const en = files[`../data/${name}.json`];
  if (locale === defaultLocale) return en as T;
  return merge(en, files[`../data/${locale}/${name}.json`]) as T;
}
