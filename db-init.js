const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function init() {
  // First connect without database to create it
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  });

  await conn.query('CREATE DATABASE IF NOT EXISTS `hipexmc_shop` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
  await conn.query('USE `hipexmc_shop`');

  // Create tables
  await conn.query(`CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sort_order INT DEFAULT 0,
    visible TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await conn.query(`CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    long_description TEXT,
    price INT NOT NULL,
    old_price INT DEFAULT NULL,
    icon_url VARCHAR(500) DEFAULT NULL,
    accent_color VARCHAR(7) DEFAULT '#10B981',
    badge VARCHAR(100) DEFAULT NULL,
    category_id VARCHAR(36) DEFAULT NULL,
    product_type ENUM('single','quantity') DEFAULT 'single',
    upgrade_group VARCHAR(100) DEFAULT NULL,
    commands_after_purchase TEXT DEFAULT NULL,
    offline_give TINYINT(1) DEFAULT 0,
    hide_from_store TINYINT(1) DEFAULT 0,
    visible TINYINT(1) DEFAULT 1,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await conn.query(`CREATE TABLE IF NOT EXISTS faqs (
    id VARCHAR(36) PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await conn.query(`CREATE TABLE IF NOT EXISTS shop_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value TEXT
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await conn.query(`CREATE TABLE IF NOT EXISTS promos (
    id VARCHAR(36) PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    discount_type ENUM('percent', 'fixed') DEFAULT 'percent',
    discount_value INT NOT NULL,
    max_uses INT DEFAULT 0,
    used_count INT DEFAULT 0,
    expires_at DATETIME DEFAULT NULL,
    active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await conn.query(`CREATE TABLE IF NOT EXISTS partners (
    id VARCHAR(36) PRIMARY KEY,
    nickname VARCHAR(255) NOT NULL,
    referral_code VARCHAR(100) NOT NULL UNIQUE,
    commission_percent INT DEFAULT 10,
    total_earned INT DEFAULT 0,
    active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await conn.query(`CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(36) PRIMARY KEY,
    nickname VARCHAR(255) NOT NULL,
    product_id VARCHAR(36) DEFAULT NULL,
    amount INT NOT NULL,
    quantity INT DEFAULT 1,
    payment_method VARCHAR(50) DEFAULT NULL,
    payment_id VARCHAR(255) DEFAULT NULL,
    status ENUM('pending', 'completed', 'cancelled') DEFAULT 'pending',
    promo_code VARCHAR(50) DEFAULT NULL,
    partner_id VARCHAR(36) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
    FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  // Add promo_code column if it doesn't exist (for existing DBs)
  try { await conn.query('ALTER TABLE orders ADD COLUMN promo_code VARCHAR(50) DEFAULT NULL'); } catch(e) {}
  try { await conn.query('ALTER TABLE orders ADD COLUMN quantity INT DEFAULT 1'); } catch(e) {}
  // Add new product columns for existing DBs
  try { await conn.query("ALTER TABLE products ADD COLUMN product_type ENUM('single','quantity') DEFAULT 'single'"); } catch(e) {}
  try { await conn.query('ALTER TABLE products ADD COLUMN upgrade_group VARCHAR(100) DEFAULT NULL'); } catch(e) {}
  try { await conn.query('ALTER TABLE products ADD COLUMN commands_after_purchase TEXT DEFAULT NULL'); } catch(e) {}
  try { await conn.query('ALTER TABLE products ADD COLUMN offline_give TINYINT(1) DEFAULT 0'); } catch(e) {}
  try { await conn.query('ALTER TABLE products ADD COLUMN hide_from_store TINYINT(1) DEFAULT 0'); } catch(e) {}

  // Audit log
  await conn.query(`CREATE TABLE IF NOT EXISTS audit_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    action VARCHAR(255) NOT NULL,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  // Insert default settings (ignore if already exist)
  const defaults = [
    ['shop_name', 'Wayfis'],
    ['shop_description', 'Wayfis — Система Автодоната: привилегии, кейсы и предметы с моментальной выдачей в игре. Режимы: Анархия - 1.'],
    ['hero_title', 'Грядущее обновление уже на подходе!'],
    ['hero_subtitle', ''],
    ['server_ip', 'mc.hipexmc.su'],
    ['server_version_from', '1.21'],
    ['server_version_to', '1.21.11'],
    ['server_mode', 'Анархия'],
    ['online_max', '20'],
    ['footer_text', '© Wayfis — Система Автодоната. Все права защищены.'],
    ['telegram_url', 'https://t.me/hipexmc'],
    ['youtube_url', 'https://www.youtube.com/@TheWayfis'],
    ['payment_platega_enabled', '0'],
    ['payment_platega_shop_id', ''],
    ['payment_platega_secret', ''],
    ['payment_platega_api_url', 'https://api.platega.io/v1'],
    ['payment_yookassa_enabled', '0'],
    ['payment_yookassa_shop_id', ''],
    ['payment_yookassa_secret', ''],
    ['delivery_method', 'rcon'],
    ['delivery_rcon_host', 'localhost'],
    ['delivery_rcon_port', '25575'],
    ['delivery_rcon_password', ''],
    ['delivery_plugin_url', 'http://localhost:19132'],
    ['delivery_plugin_key', '']
  ];

  for (const [key, value] of defaults) {
    await conn.query(
      'INSERT IGNORE INTO shop_settings (setting_key, setting_value) VALUES (?, ?)',
      [key, value]
    );
  }

  // Insert default FAQ entries (8 hardcoded questions)
  const faqDefaults = [
    ['Какой IP-адрес у сервера Wayfis?', 'IP-адрес сервера Wayfis — mc.hipexmc.su. Скопируй его и вставь в мультиплеере Minecraft для подключения к серверу.'],
    ['Как зайти на сервер Wayfis?', 'Открой Minecraft > Мультиплеер > Добавить сервер, введи адрес mc.hipexmc.su и нажми Готово. После выбери Wayfis в списке и подключись. Рекомендуем заходить на версии 1.21.11.'],
    ['Какая версия Minecraft нужна для Wayfis?', 'Сервер Wayfis работает на версии 1.21.11. Советуем играть именно на этой версии для стабильной игры.'],
    ['Какой режим игры на Wayfis?', 'На Wayfis доступен режим: Анархия - 1. Здесь нет приватов, нет запретов, и никаких донатных привилегий.'],
    ['Как получить донат на Wayfis?', 'Выбери товар на нашем сайте, который хочешь приобрести, оплати удобным способом и получи донат моментально. Мы гарантируем, что товары не сгорят на Wayfis, а администраторы следят за этим.'],
    ['Сколько стоят привилегии на Wayfis?', 'Цены на Wayfis от 49 рублей, самый дешёвый ранг — «STARLIGHT» за 49 ₽. Актуальный прайс смотри на нашем сайте.'],
    ['Как пополнить баланс через на сайте?', 'Баланс пополняется через любую карту после покупки товара в нашем магазине. Если у вас нет карты, свяжитесь с Wayfis лично, мы поможем с оплатой.'],
    ['Что делать, если донат не пришёл?', 'Напиши администратору Wayfis в личные сообщения или обратись в саппорт для проверки платежа. Если донат не пришёл, убедись, что ты всё сделал правильно при покупке, и напиши администратору Wayfis в группу или в личку на сервере.']
  ];

  const crypto = require('crypto');
  for (const [question, answer] of faqDefaults) {
    const id = crypto.createHash('md5').update(question).digest('hex').slice(0, 36);
    await conn.query(
      'INSERT IGNORE INTO faqs (id, question, answer, sort_order) VALUES (?, ?, ?, ?)',
      [id, question, answer, 0]
    );
  }

  console.log('Database initialized successfully!');
  await conn.end();
}

init().catch(console.error);
