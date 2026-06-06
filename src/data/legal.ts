export type LegalSection = {
  heading: string;
  paragraphs: string[];
};

export type LegalDocument = {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
};

export const legalDocuments = {
  privacy: {
    ru: {
      title: 'Политика конфиденциальности',
      updated: '5 июня 2026',
      intro: 'Настоящая Политика конфиденциальности описывает, как Wayfis («мы») собирает, использует и защищает персональные данные пользователей сайта wayfis.ru и связанных сервисов.',
      sections: [
        {
          heading: '1. Какие данные мы собираем',
          paragraphs: [
            'Мы можем получать данные, которые вы добровольно передаёте при обращении: имя, адрес электронной почты, никнейм в Telegram, текст сообщения и сведения о проекте.',
            'При посещении сайта автоматически могут собираться технические данные: IP-адрес, тип браузера, язык, дата и время визита, просмотренные страницы и файлы cookie.',
          ],
        },
        {
          heading: '2. Цели обработки данных',
          paragraphs: [
            'Данные используются для ответа на запросы, подготовки коммерческих предложений, заключения и исполнения договоров, улучшения работы сайта и обеспечения его безопасности.',
            'Мы не продаём персональные данные третьим лицам и не используем их для рассылки без вашего согласия.',
          ],
        },
        {
          heading: '3. Правовые основания',
          paragraphs: [
            'Обработка осуществляется на основании вашего согласия, необходимости исполнения договора, законных интересов оператора, а также требований применимого законодательства.',
          ],
        },
        {
          heading: '4. Передача третьим лицам',
          paragraphs: [
            'Данные могут передаваться только доверенным подрядчикам (хостинг, аналитика, почтовые сервисы) при условии соблюдения конфиденциальности и только в объёме, необходимом для оказания услуг.',
            'Также данные могут быть переданы по законному требованию государственных органов.',
          ],
        },
        {
          heading: '5. Срок хранения',
          paragraphs: [
            'Данные хранятся не дольше, чем это необходимо для целей обработки, или до отзыва согласия, если иное не предусмотрено законом.',
          ],
        },
        {
          heading: '6. Ваши права',
          paragraphs: [
            'Вы вправе запросить доступ к данным, их исправление, удаление, ограничение обработки или отзыв согласия, направив запрос на hello@wayfis.ru.',
          ],
        },
        {
          heading: '7. Безопасность',
          paragraphs: [
            'Мы применяем организационные и технические меры для защиты данных от несанкционированного доступа, изменения, раскрытия или уничтожения.',
          ],
        },
        {
          heading: '8. Контакты',
          paragraphs: [
            'По вопросам конфиденциальности: hello@wayfis.ru или Telegram @wayfis.',
          ],
        },
      ],
    },
    en: {
      title: 'Privacy Policy',
      updated: 'June 5, 2026',
      intro: 'This Privacy Policy explains how Wayfis ("we") collects, uses, and protects personal data of users of the wayfis.ru website and related services.',
      sections: [
        {
          heading: '1. Data we collect',
          paragraphs: [
            'We may receive data you voluntarily provide when contacting us: name, email, Telegram username, message content, and project details.',
            'When you visit the site, technical data may be collected automatically: IP address, browser type, language, visit date and time, pages viewed, and cookies.',
          ],
        },
        {
          heading: '2. Purposes of processing',
          paragraphs: [
            'Data is used to respond to inquiries, prepare proposals, enter into and perform contracts, improve the website, and ensure security.',
            'We do not sell personal data to third parties or use it for marketing without your consent.',
          ],
        },
        {
          heading: '3. Legal basis',
          paragraphs: [
            'Processing is based on your consent, contract performance, legitimate interests of the operator, and applicable legal requirements.',
          ],
        },
        {
          heading: '4. Third-party sharing',
          paragraphs: [
            'Data may be shared only with trusted contractors (hosting, analytics, email services) under confidentiality obligations and only as needed to provide services.',
            'Data may also be disclosed when required by law.',
          ],
        },
        {
          heading: '5. Retention',
          paragraphs: [
            'Data is retained only as long as necessary for processing purposes or until consent is withdrawn, unless a longer period is required by law.',
          ],
        },
        {
          heading: '6. Your rights',
          paragraphs: [
            'You may request access, correction, deletion, restriction of processing, or withdrawal of consent by contacting hello@wayfis.ru.',
          ],
        },
        {
          heading: '7. Security',
          paragraphs: [
            'We apply organizational and technical measures to protect data from unauthorized access, alteration, disclosure, or destruction.',
          ],
        },
        {
          heading: '8. Contact',
          paragraphs: [
            'For privacy inquiries: hello@wayfis.ru or Telegram @wayfis.',
          ],
        },
      ],
    },
  },
  terms: {
    ru: {
      title: 'Пользовательское соглашение',
      updated: '5 июня 2026',
      intro: 'Настоящее Соглашение регулирует использование сайта Wayfis и заказ услуг через него. Используя сайт, вы подтверждаете, что ознакомились с условиями и принимаете их.',
      sections: [
        {
          heading: '1. Общие положения',
          paragraphs: [
            'Сайт предоставляет информацию об услугах разработки программного обеспечения, сайтов и Telegram-ботов.',
            'Администратор сайта — Wayfis. Контакты указаны в разделе «Связаться».',
          ],
        },
        {
          heading: '2. Услуги и заказы',
          paragraphs: [
            'Стоимость, сроки и объём работ определяются индивидуально и фиксируются в переписке, счёте или договоре.',
            'Макеты, описания и цены на сайте носят информационный характер и не являются публичной офертой, если иное не указано явно.',
          ],
        },
        {
          heading: '3. Интеллектуальная собственность',
          paragraphs: [
            'Материалы сайта (дизайн, тексты, код, логотип) защищены авторским правом. Копирование без согласия запрещено.',
            'Права на результат работ передаются заказчику в порядке, установленном договорённостью сторон.',
          ],
        },
        {
          heading: '4. Ограничение ответственности',
          paragraphs: [
            'Сайт предоставляется «как есть». Мы не гарантируем бесперебойную работу при форс-мажоре, сбоях хостинга или действиях третьих лиц.',
            'Ответственность по договору на разработку определяется отдельным соглашением с заказчиком.',
          ],
        },
        {
          heading: '5. Запрещённые действия',
          paragraphs: [
            'Запрещается использовать сайт для незаконной деятельности, попыток взлома, распространения вредоносного ПО или спама.',
          ],
        },
        {
          heading: '6. Изменения условий',
          paragraphs: [
            'Мы можем обновлять Соглашение. Актуальная версия всегда доступна на этой странице с указанием даты обновления.',
          ],
        },
      ],
    },
    en: {
      title: 'Terms of Service',
      updated: 'June 5, 2026',
      intro: 'These Terms govern use of the Wayfis website and ordering services through it. By using the site, you confirm that you have read and accept these Terms.',
      sections: [
        {
          heading: '1. General',
          paragraphs: [
            'The site provides information about software, website, and Telegram bot development services.',
            'The site operator is Wayfis. Contact details are available in the Contact section.',
          ],
        },
        {
          heading: '2. Services and orders',
          paragraphs: [
            'Price, timeline, and scope of work are determined individually and confirmed in correspondence, invoice, or contract.',
            'Descriptions and prices on the site are informational and do not constitute a public offer unless explicitly stated.',
          ],
        },
        {
          heading: '3. Intellectual property',
          paragraphs: [
            'Site materials (design, text, code, logo) are protected by copyright. Copying without permission is prohibited.',
            'Rights to deliverables are transferred to the client as agreed between the parties.',
          ],
        },
        {
          heading: '4. Limitation of liability',
          paragraphs: [
            'The site is provided "as is". We do not guarantee uninterrupted operation during force majeure, hosting failures, or third-party actions.',
            'Liability for development work is defined in a separate agreement with the client.',
          ],
        },
        {
          heading: '5. Prohibited conduct',
          paragraphs: [
            'You may not use the site for illegal activity, hacking attempts, malware distribution, or spam.',
          ],
        },
        {
          heading: '6. Changes',
          paragraphs: [
            'We may update these Terms. The current version is always available on this page with the update date.',
          ],
        },
      ],
    },
  },
  cookies: {
    ru: {
      title: 'Политика использования cookie',
      updated: '5 июня 2026',
      intro: 'Cookie — небольшие файлы, которые сохраняются в браузере и помогают сайту работать корректно. Ниже описано, какие cookie мы используем.',
      sections: [
        {
          heading: '1. Какие cookie мы используем',
          paragraphs: [
            'Необходимые — для запоминания вашего выбора (например, согласие на cookie) и базовой работы сайта.',
            'Аналитические — могут использоваться для понимания посещаемости и улучшения UX (если подключена аналитика).',
          ],
        },
        {
          heading: '2. Срок хранения',
          paragraphs: [
            'Сессионные cookie удаляются при закрытии браузера. Постоянные — хранятся до 12 месяцев или до удаления вами.',
          ],
        },
        {
          heading: '3. Управление cookie',
          paragraphs: [
            'Вы можете отключить cookie в настройках браузера. Это может ограничить некоторые функции сайта.',
            'При первом визите мы запрашиваем согласие на использование необходимых cookie.',
          ],
        },
        {
          heading: '4. Контакты',
          paragraphs: [
            'Вопросы по cookie: hello@wayfis.ru.',
          ],
        },
      ],
    },
    en: {
      title: 'Cookie Policy',
      updated: 'June 5, 2026',
      intro: 'Cookies are small files stored in your browser that help the site function properly. Below is a description of the cookies we use.',
      sections: [
        {
          heading: '1. Cookies we use',
          paragraphs: [
            'Essential — to remember your choices (e.g. cookie consent) and enable basic site functionality.',
            'Analytics — may be used to understand traffic and improve UX (if analytics is enabled).',
          ],
        },
        {
          heading: '2. Retention',
          paragraphs: [
            'Session cookies are deleted when you close the browser. Persistent cookies are stored for up to 12 months or until you delete them.',
          ],
        },
        {
          heading: '3. Managing cookies',
          paragraphs: [
            'You can disable cookies in your browser settings. This may limit some site features.',
            'On your first visit, we ask for consent to use essential cookies.',
          ],
        },
        {
          heading: '4. Contact',
          paragraphs: [
            'Cookie questions: hello@wayfis.ru.',
          ],
        },
      ],
    },
  },
} as const satisfies Record<string, Record<'ru' | 'en', LegalDocument>>;

export type LegalDocKey = keyof typeof legalDocuments;
