export type CatalogProduct = {
  name: string;
  category: string;
  price: string;
  desc: string;
  image?: string;
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
    filters: ['Все категории', 'Боты', 'Сайты', 'Плагины', 'Другое'],
    products: [
      { name: 'Бот по вашему ТЗ', category: 'Боты', price: 'от 500 ₽', desc: 'Разработка бота любой сложности по вашему техническому заданию.' },
      { name: 'Бот магазин по вашему ТЗ', category: 'Боты', price: 'от 2 000 ₽', desc: 'Полноценный магазин в Telegram, разработанный под ваши задачи.' },
      { name: 'Саппорт бот по вашему ТЗ', category: 'Боты', price: 'от 1 500 ₽', desc: 'Система тикетов и поддержки, настроенная под ваш бизнес.' },
      { name: 'Лендинг', category: 'Сайты', price: 'от 2 000 ₽', desc: 'Одностраничный сайт с современным дизайном и адаптивностью.' },
      { name: 'Плагин Minecraft', category: 'Плагины', price: 'от 500 ₽', desc: 'Разработка уникальных плагинов для вашего сервера.' },
      { name: 'Другое', category: 'Другое', price: 'Договорная', desc: 'Не нашли нужную услугу? Напишите нам, и мы реализуем вашу идею.' },
    ],
  },
  en: {
    title: 'Catalog',
    subtitle: 'Products to launch and grow your project',
    filtersLabel: 'Filters',
    categoryLabel: 'Category',
    productBadge: 'Product',
    priceLabel: 'Price',
    filters: ['All categories', 'Bots', 'Websites', 'Plugins', 'Other'],
    products: [
      { name: 'Бот по вашему ТЗ', category: 'Боты', price: 'от 500 ₽', desc: 'Разработка бота любой сложности по вашему техническому заданию.', image: '/images/catalog/bot-custom.webp' },
      { name: 'Бот магазин по вашему ТЗ', category: 'Боты', price: 'от 2 000 ₽', desc: 'Полноценный магазин в Telegram, разработанный под ваши задачи.', image: '/images/catalog/bot-shop.webp' },
      { name: 'Саппорт бот по вашему ТЗ', category: 'Боты', price: 'от 1 500 ₽', desc: 'Система тикетов и поддержки, настроенная под ваш бизнес.', image: '/images/catalog/bot-support.webp' },
      { name: 'Лендинг', category: 'Сайты', price: 'от 2 000 ₽', desc: 'Одностраничный сайт с современным дизайном и адаптивностью.', image: '/images/catalog/landing.webp' },
      { name: 'Плагин Minecraft', category: 'Плагины', price: 'от 500 ₽', desc: 'Разработка уникальных плагинов для вашего сервера.', image: '/images/catalog/minecraft.webp' },
      { name: 'Другое', category: 'Другое', price: 'Договорная', desc: 'Не нашли нужную услугу? Напишите нам, и мы реализуем вашу идею.', image: '/images/catalog/other.webp' },
    ],
  },
};
