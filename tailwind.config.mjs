/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        dark: '#050505',
        card: '#0f0f0f',
        accent: '#3b82f6', // Основной синий
        'accent-hover': '#2563eb',
        textMain: '#ffffff',
        textMuted: '#a1a1aa',
      },
    },
  },
  plugins: [],
}
