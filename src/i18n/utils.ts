import { ui, defaultLang } from './ui';

export function getLangFromUrl(url: URL) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const pathname = url.pathname.replace(base, '');
  const [, lang] = pathname.split('/');
  if (lang in ui) return lang as keyof typeof ui;
  return defaultLang;
}

export function useTranslations(lang: keyof typeof ui) {
  return function t(key: keyof typeof ui[typeof defaultLang]) {
    return ui[lang][key] || ui[defaultLang][key];
  };
}

export function getLocalizedPath(url: URL, targetLang: keyof typeof ui) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  let pathname = url.pathname;

  if (base && pathname.startsWith(base)) {
    pathname = pathname.slice(base.length) || '/';
  }

  const pathWithoutLang = pathname.replace(/^\/en(\/|$)/, '/');
  const cleanPath = pathWithoutLang === '/' ? '' : pathWithoutLang;

  if (targetLang === 'ru') {
    return `${base}${cleanPath || '/'}`;
  }

  return `${base}/en${cleanPath || '/'}`;
}

export function getLangPrefix(lang: keyof typeof ui) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return lang === 'ru' ? base : `${base}/en`;
}
