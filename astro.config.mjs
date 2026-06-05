import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://thewayfis-byte.github.io',
  base: '/Wayfis',
  integrations: [tailwind()],
});
