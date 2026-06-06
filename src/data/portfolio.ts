import Vpn1 from '../assets/projects/Vpn1.jpg';
import Vpn2 from '../assets/projects/Vpn2.jpg';
import Vpn3 from '../assets/projects/Vpn3.jpg';
import Vpn4 from '../assets/projects/Vpn4.jpg';
import Vpn5 from '../assets/projects/Vpn5.jpg';
import Vpn6 from '../assets/projects/Vpn6.jpg';
import Romus1 from '../assets/projects/Romus1.jpg';
import Romus2 from '../assets/projects/Romus2.jpg';
import Romus3 from '../assets/projects/Romus3.jpg';
import Romus4 from '../assets/projects/Romus4.jpg';

export type PortfolioCase = {
  id: string;
  file: string;
  title: string;
  fn: string;
  desc: string;
  fullDesc: string;
  badge: string;
  tags: string[];
  link: string;
  screenshots: string[];
};

export const portfolioCases: Record<'ru' | 'en', PortfolioCase[]> = {
  ru: [
    {
      id: 'vpn',
      file: 'case_01.py',
      title: 'Telegram VPN Бот + Сайт',
      fn: 'vpn_ecosystem()',
      desc: 'Разработали Telegram-бота и сайт для автоматической выдачи VPN.',
      fullDesc: 'Полноценная экосистема для продажи VPN-услуг. Бот обрабатывает платежи через Qiwi/Lava, выдаёт конфигурации WireGuard. Сайт служит витриной и личным кабинетом пользователя.',
      badge: 'Qiwi VPN',
      tags: ['Python', 'Node.js', 'MySQL'],
      link: 'https://t.me/your_bot_link',
      screenshots: [Vpn1.src, Vpn2.src, Vpn3.src, Vpn4.src, Vpn5.src, Vpn6.src],
    },
    {
      id: 'romus',
      file: 'case_02.astro',
      title: 'Сайт-визитка — Romus site',
      fn: 'romus_portfolio()',
      desc: 'Современный сайт-портфолио с уникальным звуковым сопровождением.',
      fullDesc: 'Доработка сайта-визитки: уникальное звуковое сопровождение, плавные анимации, продуманный интерфейс с вниманием к деталям.',
      badge: 'Romus site',
      tags: ['Astro', 'TypeScript', 'JavaScript', 'MDX', 'CSS'],
      link: 'https://thatromus.github.io/romus-site/',
      screenshots: [Romus1.src, Romus2.src, Romus3.src, Romus4.src],
    },
  ],
  en: [
    {
      id: 'vpn',
      file: 'case_01.py',
      title: 'Telegram VPN Bot + Website',
      fn: 'vpn_ecosystem()',
      desc: 'Telegram bot and website for automatic VPN provisioning.',
      fullDesc: 'A complete ecosystem for selling VPN services. The bot processes payments via Qiwi/Lava and issues WireGuard configurations. The website serves as a storefront and user dashboard.',
      badge: 'Qiwi VPN',
      tags: ['Python', 'Node.js', 'MySQL'],
      link: 'https://t.me/your_bot_link',
      screenshots: [Vpn1.src, Vpn2.src, Vpn3.src, Vpn4.src, Vpn5.src, Vpn6.src],
    },
    {
      id: 'romus',
      file: 'case_02.astro',
      title: 'Portfolio site — Romus site',
      fn: 'romus_portfolio()',
      desc: 'Modern portfolio website with unique sound design.',
      fullDesc: 'Enhanced portfolio site: custom sound design, smooth animations, and a polished interface with attention to detail.',
      badge: 'Romus site',
      tags: ['Astro', 'TypeScript', 'JavaScript', 'MDX', 'CSS'],
      link: 'https://thatromus.github.io/romus-site/',
      screenshots: [Romus1.src, Romus2.src, Romus3.src, Romus4.src],
    },
  ],
};

export const portfolioCopy = {
  ru: {
    title: 'const portfolio = [];',
    subtitle: 'Реализованные проекты, которыми мы гордимся',
    cases: (n: number) => `${n} кейса`,
    openCase: 'open_case()',
    visitProject: 'visit_project()',
  },
  en: {
    title: 'const portfolio = [];',
    subtitle: 'Projects we are proud of',
    cases: (n: number) => `${n} active cases`,
    openCase: 'open_case()',
    visitProject: 'visit_project()',
  },
} as const;
