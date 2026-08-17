const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// MySQL session store — сессия живёт вечно и не сбрасывается при перезапуске
const sessionStore = new MySQLStore({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'hipexmc_shop',
  createDatabaseTable: true
});

app.use(session({
  secret: process.env.SESSION_SECRET || 'default-secret',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 365 * 24 * 60 * 60 * 1000 }
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const paymentRoutes = require('./routes/payment');
const { getOnlineCount } = require('./services/online');

app.use('/admin', adminRoutes);
app.use('/', shopRoutes);
app.use('/pay', paymentRoutes);

// Get settings for 404 page
app.use(async (req, res, next) => {
  if (res.headersSent) return next();
  const pool = require('./db');
  try {
    const [settings] = await pool.query('SELECT setting_key, setting_value FROM shop_settings');
    const s = {};
    settings.forEach(row => { s[row.setting_key] = row.setting_value; });
    const online = await getOnlineCount(s.server_ip || '');
    s.online_count = online;
    res.status(404).render('404', { settings: s, path: req.path });
  } catch (e) {
    res.status(404).render('404', { settings: {}, path: req.path });
  }
});

app.listen(PORT, () => {
  console.log(`Wayfis Shop running at http://localhost:${PORT}`);
});
