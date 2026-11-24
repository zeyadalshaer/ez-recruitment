import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

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
      filter: (page) => !page.includes('/admin') && !page.includes('/thank-you'),
      i18n: { defaultLocale: 'en', locales: { en: 'en', ar: 'ar', pl: 'pl', ro: 'ro' } },
    }),
  ],
});
