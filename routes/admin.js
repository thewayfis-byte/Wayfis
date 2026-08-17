const express = require('express');
const router = express.Router();
const pool = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { deliverOrder } = require('../services/delivery');

// Audit log helper
async function logAction(action, details) {
  try {
    const pool = require('../db');
    await pool.query('INSERT INTO audit_log (action, details) VALUES (?, ?)', [action, details || '']);
  } catch (e) {}
}

// Auth middleware
function requireAuth(req, res, next) {
  if (!req.session.admin) {
    return res.redirect('/admin/login');
  }
  next();
}

// Auto-log all POST actions for audit (excluding login)
router.post('*', (req, res, next) => {
  if (req.path === '/login' || req.path.startsWith('/login')) return next();
  if (!req.session.admin) return res.redirect('/admin/login');
  const action = req.path.split('/').filter(Boolean).join('_') || 'unknown';
  const details = req.body.name || req.body.code || req.body.nickname || req.path;
  logAction('admin_' + action, typeof details === 'string' ? details.substring(0,200) : req.path);
  next();
});

// Multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../public/uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only JPEG/PNG/WebP/GIF allowed'));
} });

// ============ LOGIN ============
router.get('/login', (req, res) => {
  if (req.session.admin) return res.redirect('/admin');
  res.render('admin/login', { error: null });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASSWORD) {
    req.session.admin = username;
    return res.redirect('/admin');
  }
  res.render('admin/login', { error: 'Неверный логин или пароль' });
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
});

// ============ DASHBOARD ============
router.get('/', requireAuth, async (req, res) => {
  try {
    const period = req.query.period || 'week';
    let dateFilter = '';
    if (period === 'today') dateFilter = 'AND DATE(created_at) = CURDATE()';
    else if (period === 'week') dateFilter = 'AND YEARWEEK(created_at) = YEARWEEK(CURDATE())';
    else if (period === 'month') dateFilter = 'AND MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())';

    const [products] = await pool.query('SELECT COUNT(*) as count FROM products');
    const [categories] = await pool.query('SELECT COUNT(*) as count FROM categories');
    const [faqs] = await pool.query('SELECT COUNT(*) as count FROM faqs');

    const [orders] = await pool.query(`SELECT * FROM orders WHERE status = "completed" ${dateFilter} ORDER BY created_at DESC LIMIT 10`);
    const [countResult] = await pool.query(`SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as revenue, COALESCE(AVG(amount), 0) as avg FROM orders WHERE status = "completed" ${dateFilter}`);

    const [prevFilter] = await pool.query(`SELECT COALESCE(SUM(amount), 0) as revenue FROM orders WHERE status = "completed" AND created_at < ${period === 'today' ? 'CURDATE()' : period === 'week' ? 'DATE_SUB(CURDATE(), INTERVAL 1 WEEK)' : period === 'month' ? 'DATE_SUB(CURDATE(), INTERVAL 1 MONTH)' : "'1970-01-01'"}`);

    const stats = countResult[0];

    res.render('admin/dashboard', {
      productsCount: products[0].count,
      categoriesCount: categories[0].count,
      faqsCount: faqs[0].count,
      recentOrders: orders,
      stats,
      prevRevenue: prevFilter[0].revenue,
      period
    });
  } catch (e) {
    res.render('admin/dashboard', { productsCount: 0, categoriesCount: 0, faqsCount: 0, recentOrders: [], stats: { count: 0, revenue: 0, avg: 0 }, prevRevenue: 0, period: 'week' });
  }
});

// ============ PRODUCTS ============
router.get('/products', requireAuth, async (req, res) => {
  try {
    const [products] = await pool.query(
      `SELECT p.*, c.name as category_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       ORDER BY p.sort_order ASC`
    );
    res.render('admin/products', { products });
  } catch (e) {
    res.status(500).send(e.message);
  }
});

router.get('/products/create', requireAuth, async (req, res) => {
  try {
    const [categories] = await pool.query('SELECT * FROM categories ORDER BY sort_order ASC');
    res.render('admin/product-form', { product: null, categories });
  } catch (e) {
    res.status(500).send(e.message);
  }
});

router.post('/products/create', requireAuth, upload.single('icon'), async (req, res) => {
  try {
    const id = uuidv4();
    const { name, description, long_description, price, old_price, accent_color, badge, category_id, product_type, upgrade_group, offline_give, hide_from_store, visible, sort_order } = req.body;
    let icon_url = null;
    if (req.file) icon_url = '/uploads/' + req.file.filename;
    const commands = req.body.commands ? JSON.stringify(req.body.commands.filter(c => c.trim())) : null;

    await pool.query(
      `INSERT INTO products (id, name, description, long_description, price, old_price, icon_url, accent_color, badge, category_id, product_type, upgrade_group, commands_after_purchase, offline_give, hide_from_store, visible, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, description, long_description, parseInt(price), old_price ? parseInt(old_price) : null, icon_url, accent_color || '#10B981', badge || null, category_id || null, product_type || 'single', upgrade_group || null, commands, offline_give === 'on' ? 1 : 0, hide_from_store === 'on' ? 1 : 0, visible === 'on' ? 1 : 0, parseInt(sort_order || 0)]
    );
    logAction('product_create', 'Создан товар: ' + name);
    res.redirect('/admin/products');
  } catch (e) {
    res.status(500).send(e.message);
  }
});

router.get('/products/edit/:id', requireAuth, async (req, res) => {
  try {
    const [products] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    const [categories] = await pool.query('SELECT * FROM categories ORDER BY sort_order ASC');
    if (!products.length) return res.status(404).send('Product not found');
    res.render('admin/product-form', { product: products[0], categories });
  } catch (e) {
    res.status(500).send(e.message);
  }
});

router.post('/products/edit/:id', requireAuth, upload.single('icon'), async (req, res) => {
  try {
    const { name, description, long_description, price, old_price, accent_color, badge, category_id, product_type, upgrade_group, offline_give, hide_from_store, visible, sort_order } = req.body;
    let icon_url = req.body.existing_icon;

    if (req.file) {
      icon_url = '/uploads/' + req.file.filename;
      // Delete old image
      if (req.body.existing_icon) {
        const oldPath = path.join(__dirname, '../public', req.body.existing_icon);
        try { fs.unlinkSync(oldPath); } catch (e) {}
      }
    }

    const commands = req.body.commands ? JSON.stringify(req.body.commands.filter(c => c.trim())) : null;

    await pool.query(
      `UPDATE products SET name=?, description=?, long_description=?, price=?, old_price=?, icon_url=?, accent_color=?, badge=?, category_id=?, product_type=?, upgrade_group=?, commands_after_purchase=?, offline_give=?, hide_from_store=?, visible=?, sort_order=?
       WHERE id=?`,
      [name, description, long_description, parseInt(price), old_price ? parseInt(old_price) : null, icon_url, accent_color || '#10B981', badge || null, category_id || null, product_type || 'single', upgrade_group || null, commands, offline_give === 'on' ? 1 : 0, hide_from_store === 'on' ? 1 : 0, visible === 'on' ? 1 : 0, parseInt(sort_order || 0), req.params.id]
    );
    logAction('product_edit', 'Изменён товар: ' + name);
    res.redirect('/admin/products');
  } catch (e) {
    res.status(500).send(e.message);
  }
});

router.post('/products/delete/:id', requireAuth, async (req, res) => {
  try {
    const [prods] = await pool.query('SELECT name, icon_url FROM products WHERE id = ?', [req.params.id]);
    if (prods.length && prods[0].icon_url) {
      const oldPath = path.join(__dirname, '../public', prods[0].icon_url);
      try { fs.unlinkSync(oldPath); } catch (e) {}
    }
    await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    logAction('product_delete', 'Удалён товар: ' + (prods[0]?.name || req.params.id));
    res.redirect('/admin/products');
  } catch (e) {
    res.status(500).send(e.message);
  }
});

// ============ CATEGORIES ============
router.get('/categories', requireAuth, async (req, res) => {
  try {
    const [categories] = await pool.query(
      `SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) as product_count
       FROM categories c ORDER BY c.sort_order ASC`
    );
    res.render('admin/categories', { categories });
  } catch (e) {
    res.status(500).send(e.message);
  }
});

router.get('/categories/create', requireAuth, (req, res) => {
  res.render('admin/category-form', { category: null });
});

router.post('/categories/create', requireAuth, async (req, res) => {
  try {
    const id = uuidv4();
    const { name, sort_order, visible } = req.body;
    await pool.query('INSERT INTO categories (id, name, sort_order, visible) VALUES (?, ?, ?, ?)',
      [id, name, parseInt(sort_order || 0), visible === 'on' ? 1 : 0]);
    res.redirect('/admin/categories');
  } catch (e) {
    res.status(500).send(e.message);
  }
});

router.get('/categories/edit/:id', requireAuth, async (req, res) => {
  try {
    const [categories] = await pool.query('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    if (!categories.length) return res.status(404).send('Category not found');
    res.render('admin/category-form', { category: categories[0] });
  } catch (e) {
    res.status(500).send(e.message);
  }
});

router.post('/categories/edit/:id', requireAuth, async (req, res) => {
  try {
    const { name, sort_order, visible } = req.body;
    await pool.query('UPDATE categories SET name=?, sort_order=?, visible=? WHERE id=?',
      [name, parseInt(sort_order || 0), visible === 'on' ? 1 : 0, req.params.id]);
    res.redirect('/admin/categories');
  } catch (e) {
    res.status(500).send(e.message);
  }
});

router.post('/categories/delete/:id', requireAuth, async (req, res) => {
  try {
    await pool.query('UPDATE products SET category_id = NULL WHERE category_id = ?', [req.params.id]);
    await pool.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
    res.redirect('/admin/categories');
  } catch (e) {
    res.status(500).send(e.message);
  }
});

// ============ FAQ ============
router.get('/faqs', requireAuth, async (req, res) => {
  try {
    const [faqs] = await pool.query('SELECT * FROM faqs ORDER BY sort_order ASC');
    res.render('admin/faqs', { faqs });
  } catch (e) {
    res.status(500).send(e.message);
  }
});

router.get('/faqs/create', requireAuth, (req, res) => {
  res.render('admin/faq-form', { faq: null });
});

router.post('/faqs/create', requireAuth, async (req, res) => {
  try {
    const id = uuidv4();
    const { question, answer, sort_order } = req.body;
    await pool.query('INSERT INTO faqs (id, question, answer, sort_order) VALUES (?, ?, ?, ?)',
      [id, question, answer, parseInt(sort_order || 0)]);
    res.redirect('/admin/faqs');
  } catch (e) {
    res.status(500).send(e.message);
  }
});

router.get('/faqs/edit/:id', requireAuth, async (req, res) => {
  try {
    const [faqs] = await pool.query('SELECT * FROM faqs WHERE id = ?', [req.params.id]);
    if (!faqs.length) return res.status(404).send('FAQ not found');
    res.render('admin/faq-form', { faq: faqs[0] });
  } catch (e) {
    res.status(500).send(e.message);
  }
});

router.post('/faqs/edit/:id', requireAuth, async (req, res) => {
  try {
    const { question, answer, sort_order } = req.body;
    await pool.query('UPDATE faqs SET question=?, answer=?, sort_order=? WHERE id=?',
      [question, answer, parseInt(sort_order || 0), req.params.id]);
    res.redirect('/admin/faqs');
  } catch (e) {
    res.status(500).send(e.message);
  }
});

router.post('/faqs/delete/:id', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM faqs WHERE id = ?', [req.params.id]);
    res.redirect('/admin/faqs');
  } catch (e) {
    res.status(500).send(e.message);
  }
});

// ============ SERVERS → redirect to categories ============
router.get('/servers', requireAuth, (req, res) => { res.redirect('/admin/categories'); });

// ============ STORE (FAQ shortcut) ============
router.get('/store', requireAuth, async (req, res) => {
  try {
    const [faqs] = await pool.query('SELECT * FROM faqs ORDER BY sort_order ASC');
    res.render('admin/store', { faqs });
  } catch (e) {
    res.status(500).send(e.message);
  }
});

// ============ PROMOS ============
router.get('/promos', requireAuth, async (req, res) => {
  try {
    const [promos] = await pool.query('SELECT * FROM promos ORDER BY created_at DESC');
    res.render('admin/promos', { promos });
  } catch (e) {
    res.status(500).send(e.message);
  }
});

router.get('/promos/create', requireAuth, (req, res) => {
  res.render('admin/promo-form', { promo: null });
});

router.post('/promos/create', requireAuth, async (req, res) => {
  try {
    const id = uuidv4();
    const { code, discount_type, discount_value, max_uses, expires_at, active } = req.body;
    await pool.query(
      'INSERT INTO promos (id, code, discount_type, discount_value, max_uses, expires_at, active) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, code.toUpperCase(), discount_type, parseInt(discount_value), parseInt(max_uses || 0), expires_at || null, active === 'on' ? 1 : 0]
    );
    res.redirect('/admin/promos');
  } catch (e) {
    res.status(500).send(e.message);
  }
});

router.get('/promos/edit/:id', requireAuth, async (req, res) => {
  try {
    const [promos] = await pool.query('SELECT * FROM promos WHERE id = ?', [req.params.id]);
    if (!promos.length) return res.status(404).send('Promo not found');
    res.render('admin/promo-form', { promo: promos[0] });
  } catch (e) {
    res.status(500).send(e.message);
  }
});

router.post('/promos/edit/:id', requireAuth, async (req, res) => {
  try {
    const { code, discount_type, discount_value, max_uses, expires_at, active } = req.body;
    await pool.query(
      'UPDATE promos SET code=?, discount_type=?, discount_value=?, max_uses=?, expires_at=?, active=? WHERE id=?',
      [code.toUpperCase(), discount_type, parseInt(discount_value), parseInt(max_uses || 0), expires_at || null, active === 'on' ? 1 : 0, req.params.id]
    );
    res.redirect('/admin/promos');
  } catch (e) {
    res.status(500).send(e.message);
  }
});

router.post('/promos/delete/:id', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM promos WHERE id = ?', [req.params.id]);
    res.redirect('/admin/promos');
  } catch (e) {
    res.status(500).send(e.message);
  }
});

// ============ PARTNERS ============
router.get('/partners', requireAuth, async (req, res) => {
  try {
    const [partners] = await pool.query('SELECT * FROM partners ORDER BY created_at DESC');
    res.render('admin/partners', { partners });
  } catch (e) {
    res.status(500).send(e.message);
  }
});

router.get('/partners/create', requireAuth, (req, res) => {
  res.render('admin/partner-form', { partner: null });
});

router.post('/partners/create', requireAuth, async (req, res) => {
  try {
    const id = uuidv4();
    const { nickname, referral_code, commission_percent, active } = req.body;
    await pool.query(
      'INSERT INTO partners (id, nickname, referral_code, commission_percent, active) VALUES (?, ?, ?, ?, ?)',
      [id, nickname, referral_code, parseInt(commission_percent || 10), active === 'on' ? 1 : 0]
    );
    res.redirect('/admin/partners');
  } catch (e) {
    res.status(500).send(e.message);
  }
});

router.get('/partners/edit/:id', requireAuth, async (req, res) => {
  try {
    const [partners] = await pool.query('SELECT * FROM partners WHERE id = ?', [req.params.id]);
    if (!partners.length) return res.status(404).send('Partner not found');
    res.render('admin/partner-form', { partner: partners[0] });
  } catch (e) {
    res.status(500).send(e.message);
  }
});

router.post('/partners/edit/:id', requireAuth, async (req, res) => {
  try {
    const { nickname, referral_code, commission_percent, active } = req.body;
    await pool.query(
      'UPDATE partners SET nickname=?, referral_code=?, commission_percent=?, active=? WHERE id=?',
      [nickname, referral_code, parseInt(commission_percent || 10), active === 'on' ? 1 : 0, req.params.id]
    );
    res.redirect('/admin/partners');
  } catch (e) {
    res.status(500).send(e.message);
  }
});

router.post('/partners/delete/:id', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM partners WHERE id = ?', [req.params.id]);
    res.redirect('/admin/partners');
  } catch (e) {
    res.status(500).send(e.message);
  }
});

// ============ FINANCE ============
router.get('/finance', requireAuth, async (req, res) => {
  try {
    const search = req.query.search || '';
    const page = parseInt(req.query.page) || 1;
    const limit = 50;
    const offset = (page - 1) * limit;

    let where = "WHERE 1=1";
    let params = [];
    if (search.trim()) {
      where = "WHERE nickname LIKE ?";
      params = [`%${search.trim()}%`];
    }

    const [orders] = await pool.query(`SELECT o.*, p.name as product_name FROM orders o LEFT JOIN products p ON o.product_id = p.id ${where} ORDER BY o.created_at DESC LIMIT ${limit} OFFSET ${offset}`, params);
    const [countResult] = await pool.query(`SELECT COUNT(*) as count FROM orders ${where}`, params);
    const totalPages = Math.max(1, Math.ceil(countResult[0].count / limit));

    const [totalRev] = await pool.query('SELECT COALESCE(SUM(amount), 0) as total FROM orders WHERE status = "completed"');
    const [todayRev] = await pool.query('SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM orders WHERE status = "completed" AND DATE(created_at) = CURDATE()');
    const [weekRev] = await pool.query('SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM orders WHERE status = "completed" AND YEARWEEK(created_at) = YEARWEEK(CURDATE())');
    const [monthRev] = await pool.query('SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM orders WHERE status = "completed" AND MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())');
    const [avgOrd] = await pool.query('SELECT COALESCE(AVG(amount), 0) as avg, COUNT(*) as count FROM orders WHERE status = "completed"');
    const [lastWeekRev] = await pool.query('SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM orders WHERE status = "completed" AND YEARWEEK(created_at) = YEARWEEK(DATE_SUB(CURDATE(), INTERVAL 1 WEEK))');
    const [byMethod] = await pool.query('SELECT payment_method, COUNT(*) as count, COALESCE(SUM(amount), 0) as revenue FROM orders WHERE status = "completed" GROUP BY payment_method');

    res.render('admin/finance', {
      orders,
      totalRevenue: totalRev[0].total,
      todayRevenue: todayRev[0].total,
      todayOrders: todayRev[0].count,
      weekRevenue: weekRev[0].total,
      weekOrders: weekRev[0].count,
      monthRevenue: monthRev[0].total,
      monthOrders: monthRev[0].count,
      avgOrder: Math.round(avgOrd[0].avg),
      totalOrders: avgOrd[0].count,
      lastWeekRevenue: lastWeekRev[0].total,
      byMethod,
      search,
      page,
      totalPages
    });
  } catch (e) {
    res.render('admin/finance', {
      orders: [],
      totalRevenue: 0, todayRevenue: 0, todayOrders: 0,
      weekRevenue: 0, weekOrders: 0,
      monthRevenue: 0, monthOrders: 0,
      avgOrder: 0, totalOrders: 0,
      lastWeekRevenue: 0,
      byMethod: [],
      search: '', page: 1, totalPages: 1
    });
  }
});

// ============ MANUAL ORDER COMPLETE ============
router.post('/orders/complete/:id', requireAuth, async (req, res) => {
  try {
    const [orders] = await pool.query('SELECT * FROM orders WHERE id = ? AND status = "pending"', [req.params.id]);
    if (!orders.length) return res.status(404).json({ error: 'Order not found or already completed' });
    await pool.query('UPDATE orders SET status = "completed" WHERE id = ?', [req.params.id]);
    const order = orders[0];
    if (order.promo_code) {
      try { await pool.query('UPDATE promos SET used_count = used_count + 1 WHERE code = ?', [order.promo_code]); } catch(e) {}
    }
    deliverOrder(req.params.id).catch(e => console.error('Manual delivery error:', e.message));
    logAction('order_complete', 'Ручное завершение заказа ' + req.params.id.slice(0,8) + ' — ' + order.nickname);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============ ORDER DETAIL ============
router.get('/orders/:id', requireAuth, async (req, res) => {
  try {
    const [orders] = await pool.query('SELECT o.*, p.name as product_name FROM orders o LEFT JOIN products p ON o.product_id = p.id WHERE o.id = ?', [req.params.id]);
    if (!orders.length) return res.status(404).send('Order not found');
    res.render('admin/order-detail', { order: orders[0] });
  } catch (e) {
    res.status(500).send(e.message);
  }
});

// ============ DELIVERY ============
router.get('/delivery', requireAuth, async (req, res) => {
  try {
    const [settings] = await pool.query("SELECT * FROM shop_settings WHERE setting_key LIKE 'delivery_%' ORDER BY setting_key ASC");
    const s = {};
    settings.forEach(row => { s[row.setting_key] = row.setting_value; });
    res.render('admin/delivery', { settings: s });
  } catch (e) {
    res.status(500).send(e.message);
  }
});

router.post('/delivery', requireAuth, async (req, res) => {
  try {
    for (const [key, value] of Object.entries(req.body)) {
      const val = Array.isArray(value) ? value[value.length - 1] : value;
      await pool.query(
        'INSERT INTO shop_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
        [key, val, val]
      );
    }
    res.redirect('/admin/delivery');
  } catch (e) {
    res.status(500).send(e.message);
  }
});

// ============ DELIVERY STATUS CHECK ============
router.get('/delivery/status', requireAuth, async (req, res) => {
  try {
    const [settings] = await pool.query("SELECT * FROM shop_settings WHERE setting_key LIKE 'delivery_%'");
    const s = {};
    settings.forEach(row => { s[row.setting_key] = row.setting_value; });
    const method = s.delivery_method || 'rcon';

    if (method === 'plugin') {
      const url = (s.delivery_plugin_url || 'http://localhost:19132') + '/health';
      const http = url.startsWith('https') ? require('https') : require('http');
      const result = await new Promise(resolve => {
        const req = http.get(url, res2 => {
          resolve(true);
          res2.resume();
        });
        req.on('error', () => resolve(false));
        req.setTimeout(3000, () => { req.destroy(); resolve(false); });
      });
      return res.json({ connected: result });
    }

    try {
      const Rcon = require('rcon-client').Rcon;
      const conn = await Rcon.connect({
        host: s.delivery_rcon_host || 'localhost',
        port: parseInt(s.delivery_rcon_port || 25575),
        password: s.delivery_rcon_password || ''
      });
      conn.end();
      return res.json({ connected: true });
    } catch (e) {
      return res.json({ connected: false });
    }
  } catch (e) {
    res.json({ connected: false });
  }
});

router.post('/delivery/test', requireAuth, async (req, res) => {
  try {
    const { url, key } = req.body;
    if (!url) return res.json({ success: false, error: 'URL не указан' });

    const http = url.startsWith('https') ? require('https') : require('http');
    const body = JSON.stringify({ commands: ["say WayfisDelivery — тестовая команда"], nickname: "Admin", product_name: "Test" });

    const result = await new Promise(resolve => {
      const parsed = new URL(url + '/execute');
      const opts = {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname,
        method: 'POST',
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + (key || ''),
          'Content-Length': Buffer.byteLength(body)
        }
      };
      const req = http.request(opts, res2 => {
        let data = '';
        res2.on('data', c => data += c);
        res2.on('end', () => {
          try {
            const j = JSON.parse(data);
            resolve({ success: true, executed: j.executed || 0 });
          } catch (e) {
            resolve({ success: true, executed: 0 });
          }
        });
      });
      req.on('error', e => resolve({ success: false, error: e.message }));
      req.on('timeout', () => { req.destroy(); resolve({ success: false, error: 'Timeout' }); });
      req.write(body);
      req.end();
    });

    res.json(result);
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// ============ PAYMENTS ============
router.get('/payments', requireAuth, async (req, res) => {
  try {
    const [settings] = await pool.query('SELECT * FROM shop_settings WHERE setting_key LIKE "payment_%" ORDER BY setting_key ASC');
    const s = {};
    settings.forEach(row => { s[row.setting_key] = row.setting_value; });
    res.render('admin/payments', { settings: s, baseUrl: `${req.protocol}://${req.get('host')}` });
  } catch (e) {
    res.status(500).send(e.message);
  }
});

router.post('/payments', requireAuth, async (req, res) => {
  try {
    for (const [key, value] of Object.entries(req.body)) {
      const val = Array.isArray(value) ? value[value.length - 1] : value;
      await pool.query(
        'INSERT INTO shop_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
        [key, val, val]
      );
    }
    res.redirect('/admin/payments');
  } catch (e) {
    res.status(500).send(e.message);
  }
});

// ============ SETTINGS ============
router.get('/settings', requireAuth, async (req, res) => {
  try {
    const [settings] = await pool.query('SELECT * FROM shop_settings ORDER BY setting_key ASC');
    const s = {};
    settings.forEach(row => { s[row.setting_key] = row.setting_value; });
    res.render('admin/settings', { settings: s, baseUrl: `${req.protocol}://${req.get('host')}` });
  } catch (e) {
    res.status(500).send(e.message);
  }
});

router.post('/settings', requireAuth, async (req, res) => {
  try {
    for (const [key, value] of Object.entries(req.body)) {
      const val = Array.isArray(value) ? value[value.length - 1] : value;
      await pool.query(
        'INSERT INTO shop_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
        [key, val, val]
      );
    }
    res.redirect('/admin/settings');
  } catch (e) {
    res.status(500).send(e.message);
  }
});

// ============ AUDIT LOG ============
router.get('/audit', requireAuth, async (req, res) => {
  try {
    const [logs] = await pool.query('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 200');
    res.render('admin/audit', { logs });
  } catch (e) {
    res.status(500).send(e.message);
  }
});

module.exports = router;