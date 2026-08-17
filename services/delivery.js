const pool = require('../db');

async function deliverOrder(orderId) {
  const [orders] = await pool.query('SELECT * FROM orders WHERE id = ?', [orderId]);
  if (!orders.length) throw new Error('Order not found');
  const order = orders[0];

  const [products] = await pool.query('SELECT * FROM products WHERE id = ?', [order.product_id]);
  if (!products.length) {
    console.log('No product found for order ' + orderId + ', skipping delivery');
    return;
  }
  const product = products[0];

  let commands = [];
  if (product.commands_after_purchase) {
    try {
      commands = JSON.parse(product.commands_after_purchase);
    } catch (e) {
      commands = [];
    }
  }

  if (!commands.length) {
    console.log('No commands configured for product ' + product.name);
    return;
  }

  const nick = order.nickname || 'unknown';
  const qty = order.quantity || 1;

  // === upgrade_group check ===
  if (product.upgrade_group && product.upgrade_group.trim()) {
    const group = product.upgrade_group.trim();
    const [previous] = await pool.query(
      "SELECT p.price, p.name FROM orders o JOIN products p ON o.product_id = p.id WHERE o.nickname = ? AND p.upgrade_group = ? AND p.id != ? AND o.status = 'completed' AND o.id != ? ORDER BY p.price DESC LIMIT 1",
      [nick, group, product.id, orderId]
    );
    if (previous.length > 0 && previous[0].price >= product.price) {
      console.log(`Upgrade skip: ${nick} already owns ${previous[0].name} (${previous[0].price} ≥ ${product.price}) in group "${group}"`);
      return;
    }
  }

  // === offline_give check (only for RCON) ===
  if (!product.offline_give) {
    const [settings] = await pool.query("SELECT setting_key, setting_value FROM shop_settings WHERE setting_key LIKE 'delivery_%'");
    const s = {};
    settings.forEach(row => { s[row.setting_key] = row.setting_value; });
    const method = s.delivery_method || 'rcon';
    if (method === 'rcon') {
      const isOnline = await checkPlayerOnline(nick, s);
      if (!isOnline) {
        console.log(`Offline skip: ${nick} is not online, offline_give=0`);
        return;
      }
    }
  }

  // Replace variables + arithmetic
  commands = commands.map(cmd => {
    let result = cmd
      .replace(/\{player\}/g, nick)
      .replace(/\{product\}/g, product.name)
      .replace(/\{quantity\}/g, qty);

    result = result.replace(/\{quantity\s*\*\s*(\d+)\}/g, (match, num) => {
      return String(qty * parseInt(num));
    });

    return result;
  });

  const [settings] = await pool.query("SELECT setting_key, setting_value FROM shop_settings WHERE setting_key LIKE 'delivery_%'");
  const s = {};
  settings.forEach(row => { s[row.setting_key] = row.setting_value; });
  const method = s.delivery_method || 'rcon';

  if (method === 'rcon') {
    await deliverViaRcon(commands, s);
  } else if (method === 'plugin') {
    await deliverViaPlugin(commands, s, nick, product.name);
  }

  console.log('Delivered ' + commands.length + ' commands for order ' + orderId);
}

async function checkPlayerOnline(nick, settings) {
  const Rcon = require('rcon-client').Rcon;
  const host = settings.delivery_rcon_host || 'localhost';
  const port = parseInt(settings.delivery_rcon_port || 25575);
  const password = settings.delivery_rcon_password || '';
  if (!password) return true;
  try {
    const rcon = await Rcon.connect({ host, port, password });
    const result = await rcon.send('list');
    rcon.end();
    const match = result.match(/:\s*(.*)$/);
    if (!match) return false;
    const players = match[1].split(',').map(p => p.trim().toLowerCase());
    return players.includes(nick.toLowerCase());
  } catch (e) {
    console.error('RCON online check failed:', e.message);
    return true;
  }
}

async function deliverViaRcon(commands, settings) {
  const Rcon = require('rcon-client').Rcon;
  const host = settings.delivery_rcon_host || 'localhost';
  const port = parseInt(settings.delivery_rcon_port || 25575);
  const password = settings.delivery_rcon_password || '';
  if (!password) { console.log('RCON password not configured, skipping delivery'); return; }
  try {
    const rcon = await Rcon.connect({ host, port, password });
    for (const cmd of commands) {
      try {
        await rcon.send(cmd);
        console.log('RCON command executed: /' + cmd);
      } catch (e) {
        console.error('RCON command failed: /' + cmd, e.message);
      }
    }
    rcon.end();
  } catch (e) {
    console.error('RCON connection failed:', e.message);
    throw e;
  }
}

async function deliverViaPlugin(commands, settings, nickname, productName) {
  const https = require('https');
  const http = require('http');
  const url = settings.delivery_plugin_url || 'http://localhost:19132';
  const apiKey = settings.delivery_plugin_key || '';
  if (!apiKey) { console.log('Plugin API key not configured, skipping delivery'); return; }
  const body = JSON.stringify({ commands, nickname, product_name: productName });
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url + '/execute');
    const client = parsedUrl.protocol === 'https:' ? https : http;
    const req = client.request(parsedUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
        'Content-Length': Buffer.byteLength(body)
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => { console.log('Plugin response:', data); resolve(data); });
    });
    req.on('error', e => { console.error('Plugin HTTP request failed:', e.message); reject(e); });
    req.write(body);
    req.end();
  });
}

module.exports = { deliverOrder };