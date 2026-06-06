export type Review = {
  author: string;
  date: string;
  product: string;
  content: string;
  rating: number;
  avatar: string;
};

export type ReviewsContent = {
  title: string;
  subtitle: string;
  averageLabel: string;
  reviews: Review[];
};

export const reviewsContent: Record<'ru' | 'en', ReviewsContent> = {
  ru: {
    title: 'Отзывы',
    subtitle: 'Что говорят клиенты о работе с Wayfis',
    averageLabel: 'Средняя оценка',
    reviews: [
      {
        author: 'Сергей Т.',
        date: '3 июн. 2026',
        product: 'Telegram Bot Shop',
        content: 'Отличный бот, всё работает из коробки. Автор помог с настройкой API — отдельное спасибо!',
        rating: 5,
        avatar: 'ST',
      },
      {
        author: 'Александр',
        date: '1 июн. 2026',
        product: 'Landing Page Template',
        content: 'Дизайн отличный, код чистый — легко адаптировал под свои задачи.',
        rating: 5,
        avatar: 'A',
      },
      {
        author: 'Дмитрий',
        date: '28 мая 2026',
        product: 'Admin Dashboard',
        content: 'Пока разбираюсь с интеграцией, но поддержка отвечает быстро и по делу.',
        rating: 4,
        avatar: 'D',
      },
    ],
  },
  en: {
    title: 'Reviews',
    subtitle: 'What clients say about working with Wayfis',
    averageLabel: 'Average rating',
    reviews: [
      {
        author: 'Sergey T.',
        date: 'Jun 3, 2026',
        product: 'Telegram Bot Shop',
        content: 'Great bot — everything works out of the box. The developer helped with API setup, much appreciated!',
        rating: 5,
        avatar: 'ST',
      },
      {
        author: 'Alexander',
        date: 'Jun 1, 2026',
        product: 'Landing Page Template',
        content: 'Excellent design and clean code. Easy to adapt to my needs.',
        rating: 5,
        avatar: 'A',
      },
      {
        author: 'Dmitry',
        date: 'May 28, 2026',
        product: 'Admin Dashboard',
        content: 'Still integrating it into my project, but support responds quickly and helpfully.',
        rating: 4,
        avatar: 'D',
      },
    ],
  },
};
