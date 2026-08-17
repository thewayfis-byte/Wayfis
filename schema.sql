CREATE DATABASE IF NOT EXISTS hipexmc_shop CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hipexmc_shop;

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  sort_order INT DEFAULT 0,
  visible TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Products
CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  long_description TEXT,
  price INT NOT NULL COMMENT 'price in rubles (not kopecks)',
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- FAQ
CREATE TABLE IF NOT EXISTS faqs (
  id VARCHAR(36) PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Promo codes
CREATE TABLE IF NOT EXISTS promos (
  id VARCHAR(36) PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  discount_type ENUM('percent', 'fixed') DEFAULT 'percent',
  discount_value INT NOT NULL,
  max_uses INT DEFAULT 0,
  used_count INT DEFAULT 0,
  expires_at DATETIME DEFAULT NULL,
  active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Partners
CREATE TABLE IF NOT EXISTS partners (
  id VARCHAR(36) PRIMARY KEY,
  nickname VARCHAR(255) NOT NULL,
  referral_code VARCHAR(100) NOT NULL UNIQUE,
  commission_percent INT DEFAULT 10,
  total_earned INT DEFAULT 0,
  active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Orders / Payments
CREATE TABLE IF NOT EXISTS orders (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Shop Settings (key-value)
CREATE TABLE IF NOT EXISTS shop_settings (
  setting_key VARCHAR(100) PRIMARY KEY,
  setting_value TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert default settings
INSERT IGNORE INTO shop_settings (setting_key, setting_value) VALUES
('shop_name', 'Wayfis'),
('shop_description', 'Wayfis — Система Автодоната: привилегии, кейсы и предметы с моментальной выдачей в игре. Режимы: Анархия - 1.'),
('hero_title', 'Грядущее обновление уже на подходе!'),
('hero_subtitle', ''),
('server_ip', 'mc.hipexmc.su'),
('server_version_from', '1.21'),
('server_version_to', '1.21.11'),
('server_mode', 'Анархия - 1'),
('online_max', '20'),
('theme_accent', '#10B981'),
('theme_bg', '#0E1A12'),
('footer_text', '© Wayfis — Система Автодоната. Все права защищены.'),
('telegram_url', 'https://t.me/hipexmc'),
('youtube_url', 'https://www.youtube.com/@TheWayfis'),
('payment_platega_enabled', '0'),
('payment_platega_shop_id', ''),
('payment_platega_secret', ''),
('payment_platega_api_url', 'https://api.platega.io/v1'),
('payment_yookassa_enabled', '0'),
('payment_yookassa_shop_id', ''),
('payment_yookassa_secret', '');