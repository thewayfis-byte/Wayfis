export type CatalogProduct = {
  name: string;
  category: string;
  price: string;
  desc: string;
};

export type CatalogContent = {
  title: string;
  subtitle: string;
  filtersLabel: string;
  categoryLabel: string;
  productBadge: string;
  priceLabel: string;
  filters: string[];
  products: CatalogProduct[];
};

export const catalog: Record<'ru' | 'en', CatalogContent> = {
  ru: {
    title: 'Каталог',
    subtitle: 'Товары для запуска и развития проекта',
    filtersLabel: 'Фильтры',
    categoryLabel: 'Категория',
    productBadge: 'Товар',
    priceLabel: 'Цена',
    filters: ['Все категории', 'Плагины', 'Сборки', 'Сайты', 'Проекты', 'Карты'],
    products: [
      { name: 'Telegram Bot Shop', category: 'Боты', price: '2 500 ₽', desc: 'Готовый бот для продажи цифровых товаров.' },
      { name: 'Landing Page Template', category: 'Сайты', price: '5 000 ₽', desc: 'Современный лендинг на Astro + Tailwind.' },
      { name: 'Admin Dashboard', category: 'Сайты', price: '8 000 ₽', desc: 'Панель управления для вашего бизнеса.' },
      { name: 'Support Bot', category: 'Боты', price: '1 500 ₽', desc: 'Бот для тикетов и поддержки клиентов.' },
    ],
  },
  en: {
    title: 'Catalog',
    subtitle: 'Products to launch and grow your project',
    filtersLabel: 'Filters',
    categoryLabel: 'Category',
    productBadge: 'Product',
    priceLabel: 'Price',
    filters: ['All categories', 'Plugins', 'Builds', 'Websites', 'Projects', 'Maps'],
    products: [
      { name: 'Telegram Bot Shop', category: 'Bots', price: '₽2,500', desc: 'Ready-made bot for selling digital goods.' },
      { name: 'Landing Page Template', category: 'Websites', price: '₽5,000', desc: 'Modern landing page built with Astro + Tailwind.' },
      { name: 'Admin Dashboard', category: 'Websites', price: '₽8,000', desc: 'Admin panel for your business.' },
      { name: 'Support Bot', category: 'Bots', price: '₽1,500', desc: 'Bot for tickets and customer support.' },
    ],
  },
};
