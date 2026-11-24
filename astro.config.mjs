import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import locales from './src/lib/locales.json' with { type: 'json' };

// Languages that are not yet published stay out of the sitemap.
const hidden = locales.review.map((l) => `/${l}/`);

// Production domain. Change it here if the domain ever changes.
export default defineConfig({
  site: 'https://ez-recruitment.com',
  trailingSlash: 'always',
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'ar', 'pl', 'ro'],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/admin') && !page.includes('/thank-you') && !hidden.some((h) => new URL(page).pathname.startsWith(h)),
      i18n: { defaultLocale: 'en', locales: Object.fromEntries(['en', ...locales.published.filter((l) => l !== 'en')].map((l) => [l, l])) },
    }),
  ],
});
