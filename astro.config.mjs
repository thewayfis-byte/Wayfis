import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://wayfis.ru',
  base: '/',
  integrations: [tailwind(), sitemap()],
});
