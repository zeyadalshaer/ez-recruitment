/**
 * Language support.
 *
 * English lives at the site root (unchanged URLs). Other languages live under /ar/, /pl/, /ro/.
 * A language is only visible to visitors (selector, hreflang, sitemap) once it appears in
 * `publishedLocales`. Translations stay hidden until a person has reviewed them.
 */
export const locales = ['en', 'ar', 'pl', 'ro'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

/** Add a language here only after its translation has been reviewed. */
export const publishedLocales: Locale[] = ['en'];

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
