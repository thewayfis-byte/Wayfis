import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://wayfis.ru',
  base: '/',
  integrations: [tailwind()],
});
