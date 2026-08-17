const express = require('express');
const router = express.Router();
const pool = require('../db');
const { getOnlineCount, getOnlineMax } = require('../services/online');

router.get('/', async (req, res) => {
  try {
    const [settings] = await pool.query('SELECT setting_key, setting_value FROM shop_settings');
    const [products] = await pool.query('SELECT * FROM products WHERE visible = 1 AND hide_from_store = 0 ORDER BY sort_order ASC');
    const [categories] = await pool.query('SELECT * FROM categories WHERE visible = 1 ORDER BY sort_order ASC');
    const [faqs] = await pool.query('SELECT * FROM faqs ORDER BY sort_order ASC');
    const [orders] = await pool.query('SELECT * FROM orders WHERE status = "completed" ORDER BY created_at DESC LIMIT 50');

    const s = {};
    settings.forEach(row => { s[row.setting_key] = row.setting_value; });

    const online = await getOnlineCount(s.server_ip || '');
    const max = getOnlineMax() || parseInt(s.online_max) || 20;
    s.online_count = online;
    s.online_max = max;

    res.render('index', {
      settings: s,
      products,
      categories,
      faqs,
      recentOrders: orders
    });
  } catch (e) {
    console.error('Shop error:', e.message);
    res.render('index', { settings: {}, products: [], categories: [], faqs: [], recentOrders: [] });
  }
});

router.get('/product/:id', async (req, res) => {
  try {
    const [products] = await pool.query('SELECT * FROM products WHERE id = ? AND visible = 1', [req.params.id]);
    if (!products.length) return res.redirect('/');
    const product = products[0];

    const [settings] = await pool.query('SELECT setting_key, setting_value FROM shop_settings');
    const s = {};
    settings.forEach(row => { s[row.setting_key] = row.setting_value; });

    res.render('product', { product, settings: s });
  } catch (e) {
    console.error('Product page error:', e.message);
    res.redirect('/');
  }
});

router.get('/terms', async (req, res) => {
  const [settings] = await pool.query('SELECT setting_key, setting_value FROM shop_settings');
  const s = {};
  settings.forEach(row => { s[row.setting_key] = row.setting_value; });
  res.render('terms', { settings: s });
});

router.get('/privacy', async (req, res) => {
  const [settings] = await pool.query('SELECT setting_key, setting_value FROM shop_settings');
  const s = {};
  settings.forEach(row => { s[row.setting_key] = row.setting_value; });
  res.render('privacy', { settings: s });
});

router.get('/profile/orders', async (req, res) => {
  try {
    const nick = req.query.nick || '';
    const [settings] = await pool.query('SELECT setting_key, setting_value FROM shop_settings');
    const s = {};
    settings.forEach(row => { s[row.setting_key] = row.setting_value; });

    let orders = [];
    if (nick.trim()) {
      [orders] = await pool.query(
        "SELECT o.*, p.name as product_name FROM orders o LEFT JOIN products p ON o.product_id = p.id WHERE o.nickname = ? AND o.status = 'completed' ORDER BY o.created_at DESC LIMIT 50",
        [nick.trim()]
      );
    }

    res.render('profile-orders', { settings: s, orders, nick: nick.trim() });
  } catch (e) {
    console.error('Profile error:', e.message);
    res.redirect('/');
  }
});

// JSON endpoint for live online count
router.get('/api/online', async (req, res) => {
  try {
    const [settings] = await pool.query('SELECT setting_key, setting_value FROM shop_settings');
    const s = {};
    settings.forEach(row => { s[row.setting_key] = row.setting_value; });
    const online = await getOnlineCount(s.server_ip || '');
    const max = getOnlineMax() || parseInt(s.online_max) || 20;
    res.json({ online, max, percent: Math.min(Math.round((online / max) * 100), 100) });
  } catch (e) {
    res.json({ online: 0, max: 20, percent: 0 });
  }
});

module.exports = router;
