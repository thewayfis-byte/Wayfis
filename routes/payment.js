const express = require('express');
const router = express.Router();
const pool = require('../db');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { deliverOrder } = require('../services/delivery');

async function getAllSettings() {
  const [rows] = await pool.query('SELECT setting_key, setting_value FROM shop_settings');
  const s = {};
  rows.forEach(r => { s[r.setting_key] = r.setting_value; });
  return s;
}

// ============ CREATE PAYMENT ============
router.post('/create', async (req, res) => {
  try {
    const { nick, items, promo } = req.body;

    if (!nick || !nick.trim()) {
      return res.status(400).json({ error: 'Введите ник в Minecraft' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Корзина пуста' });
    }

    const settings = await getAllSettings();

    const yookassaEnabled = settings.payment_yookassa_enabled === '1';
    const plategaEnabled = settings.payment_platega_enabled === '1';
    const unitpayEnabled = settings.payment_unitpay_enabled === '1';
    const freekassaEnabled = settings.payment_freekassa_enabled === '1';

    const productIds = items.map(i => i.id);
    const [dbProducts] = await pool.query('SELECT * FROM products WHERE id IN (?)', [productIds]);
    const dbProductMap = {};
    dbProducts.forEach(p => { dbProductMap[p.id] = p; });

    let totalAmount = 0;
    let totalQty = 0;
    for (const item of items) {
      const dbProduct = dbProductMap[item.id];
      if (!dbProduct) continue;
      const qty = parseInt(item.qty) || 1;
      totalAmount += dbProduct.price * qty;
      totalQty += qty;
    }

    if (totalAmount <= 0) {
      return res.status(400).json({ error: 'Некорректная сумма' });
    }

    let discount = 0;
    let promoCode = null;
    if (promo && promo.trim()) {
      const [promoRows] = await pool.query(
        'SELECT * FROM promos WHERE code = ? AND active = 1',
        [promo.trim().toUpperCase()]
      );
      if (promoRows.length > 0) {
        const p = promoRows[0];
        const notExpired = !p.expires_at || new Date(p.expires_at) > new Date();
        const notExhausted = p.max_uses === 0 || p.used_count < p.max_uses;
        if (notExpired && notExhausted) {
          if (p.discount_type === 'percent') {
            discount = Math.round(totalAmount * p.discount_value / 100);
          } else {
            discount = Math.min(p.discount_value, totalAmount);
          }
          promoCode = promo.trim().toUpperCase();
        }
      }
    }

    const finalAmount = totalAmount - discount;
    const orderId = uuidv4();

    await pool.query(
      `INSERT INTO orders (id, nickname, amount, quantity, promo_code, status) VALUES (?, ?, ?, ?, ?, 'pending')`,
      [orderId, nick.trim(), finalAmount, totalQty || 1, promoCode]
    );

    const firstItem = items[0];
    if (firstItem) {
      await pool.query('UPDATE orders SET product_id = ? WHERE id = ?', [firstItem.id, orderId]);
    }

    let paymentUrl = null;
    let paymentMethod = null;

    // Try YooKassa first
    if (yookassaEnabled) {
      paymentMethod = 'yookassa';
      const shopId = settings.payment_yookassa_shop_id;
      const secret = settings.payment_yookassa_secret;

      if (shopId && secret) {
        try {
          const auth = Buffer.from(`${shopId}:${secret}`).toString('base64');
          const body = {
            amount: { value: finalAmount.toFixed(2), currency: 'RUB' },
            confirmation: {
              type: 'redirect',
              return_url: `${req.protocol}://${req.get('host')}/pay/success?order=${orderId}`
            },
            capture: true,
            description: `Заказ #${orderId.slice(0, 8)} — ${nick.trim()}`,
            metadata: { order_id: orderId, nick: nick.trim() }
          };

          const resp = await fetch('https://api.yookassa.ru/v3/payments', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Basic ${auth}`,
              'Idempotence-Key': orderId
            },
            body: JSON.stringify(body)
          });

          const data = await resp.json();

          if (data.confirmation && data.confirmation.confirmation_url) {
            paymentUrl = data.confirmation.confirmation_url;
            await pool.query('UPDATE orders SET payment_id = ?, payment_method = ? WHERE id = ?', [data.id, 'yookassa', orderId]);
          } else {
            console.error('YooKassa error:', JSON.stringify(data));
          }
        } catch (e) {
          console.error('YooKassa request failed:', e.message);
        }
      }
    }

    // Fallback to Platega
    if (!paymentUrl && plategaEnabled) {
      paymentMethod = 'platega';
      const shopId = settings.payment_platega_shop_id;
      const apiKey = settings.payment_platega_secret;
      const apiUrl = settings.payment_platega_api_url || 'https://api.platega.io/v1';

      if (shopId && apiKey) {
        try {
          const resp = await fetch(`${apiUrl}/payments/create`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              shop_id: shopId,
              amount: finalAmount,
              currency: 'RUB',
              order_id: orderId,
              description: `Заказ #${orderId.slice(0, 8)} — ${nick.trim()}`,
              success_url: `${req.protocol}://${req.get('host')}/pay/success?order=${orderId}`,
              cancel_url: `${req.protocol}://${req.get('host')}/pay/cancel?order=${orderId}`,
              webhook_url: `${req.protocol}://${req.get('host')}/pay/webhook/platega`
            })
          });

          const data = await resp.json();

          if (data.url || (data.data && data.data.url)) {
            const redirectUrl = data.url || data.data.url;
            paymentUrl = redirectUrl;
            const transactionId = data.transaction_id || data.data?.transaction_id || orderId;
            await pool.query('UPDATE orders SET payment_id = ?, payment_method = ? WHERE id = ?', [transactionId, 'platega', orderId]);
          } else {
            console.error('Platega error:', JSON.stringify(data));
          }
        } catch (e) {
          console.error('Platega request failed:', e.message);
        }
      }
    }

    // Fallback to UnitPay
    if (!paymentUrl && unitpayEnabled) {
      paymentMethod = 'unitpay';
      const publicKey = settings.payment_unitpay_public_key;
      const secretKey = settings.payment_unitpay_secret_key;

      if (publicKey && secretKey) {
        try {
          const params = {
            account: orderId,
            sum: finalAmount.toFixed(2),
            desc: `Заказ #${orderId.slice(0, 8)} — ${nick.trim()}`,
            currency: 'RUB'
          };

          // Generate signature
          const signatureStr = Object.keys(params)
            .sort()
            .map(k => `${k}=${params[k]}`)
            .join('&')
            .toLowerCase()
            .replace(/%20/g, '+')
            .replace(/%26/g, '&')
            .replace(/%3D/g, '=');

          const signature = crypto
            .createHash('sha256')
            .update(`${signatureStr}${secretKey}`)
            .digest('hex');

          const query = new URLSearchParams({
            ...params,
            publicKey,
            signature,
            hideMenu: 'true',
            resultUrl: `${req.protocol}://${req.get('host')}/pay/success?order=${orderId}`
          }).toString();

          paymentUrl = `https://unitpay.money/pay/${publicKey}?${query}`;
          await pool.query('UPDATE orders SET payment_id = ?, payment_method = ? WHERE id = ?', [orderId, 'unitpay', orderId]);
        } catch (e) {
          console.error('UnitPay error:', e.message);
        }
      }
    }

    // Fallback to Free-Kassa
    if (!paymentUrl && freekassaEnabled) {
      paymentMethod = 'freekassa';
      const merchantId = settings.payment_freekassa_shop_id;
      const secret1 = settings.payment_freekassa_secret1;

      if (merchantId && secret1) {
        try {
          const signStr = `${merchantId}:${finalAmount}:${secret1}:${orderId}`;
          const sign = crypto.createHash('md5').update(signStr).digest('hex');

          const query = new URLSearchParams({
            merchant_id: merchantId,
            amount: finalAmount.toFixed(2),
            order_id: orderId,
            currency: 'RUB',
            sign,
            us_desc: `Заказ #${orderId.slice(0, 8)}`,
            us_nick: nick.trim()
          }).toString();

          paymentUrl = `https://pay.freekassa.ru/?${query}`;
          await pool.query('UPDATE orders SET payment_id = ?, payment_method = ? WHERE id = ?', [orderId, 'freekassa', orderId]);
        } catch (e) {
          console.error('FreeKassa error:', e.message);
        }
      }
    }

    if (!paymentUrl) {
      await pool.query('UPDATE orders SET status = "completed" WHERE id = ?', [orderId]);
      await pool.query('UPDATE orders SET payment_method = ? WHERE id = ?', [paymentMethod || 'test', orderId]);
      deliverOrder(orderId).catch(e => console.error('Delivery error:', e.message));
    }

    return res.json({
      success: true,
      redirect: paymentUrl || `/pay/success?order=${orderId}`,
      orderId
    });

  } catch (e) {
    console.error('Payment create error:', e);
    res.status(500).json({ error: 'Ошибка при создании платежа' });
  }
});

// ============ PROMO VALIDATION ============
router.post('/promo', async (req, res) => {
  try {
    const { code, total } = req.body;
    if (!code) return res.status(400).json({ error: 'Введите промокод' });

    const [promoRows] = await pool.query(
      'SELECT * FROM promos WHERE code = ? AND active = 1',
      [code.trim().toUpperCase()]
    );

    if (promoRows.length === 0) {
      return res.status(404).json({ error: 'Промокод не найден' });
    }

    const p = promoRows[0];
    const notExpired = !p.expires_at || new Date(p.expires_at) > new Date();
    const notExhausted = p.max_uses === 0 || p.used_count < p.max_uses;

    if (!notExpired) return res.status(400).json({ error: 'Промокод истёк' });
    if (!notExhausted) return res.status(400).json({ error: 'Промокод использован полностью' });

    let discount = 0;
    if (p.discount_type === 'percent') {
      discount = Math.round((total || 0) * p.discount_value / 100);
    } else {
      discount = Math.min(p.discount_value, total || 0);
    }

    return res.json({ success: true, discount, description: p.discount_type === 'percent' ? `-${p.discount_value}%` : `-${p.discount_value} ₽` });

  } catch (e) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Shared function to complete order
async function completeOrder(orderId) {
  try {
    const [rows] = await pool.query('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!rows.length || rows[0].status !== 'pending') return;
    await pool.query('UPDATE orders SET status = "completed" WHERE id = ? AND status = "pending"', [orderId]);
    if (rows[0].promo_code) {
      await pool.query('UPDATE promos SET used_count = used_count + 1 WHERE code = ?', [rows[0].promo_code]);
    }
    deliverOrder(orderId).catch(e => console.error('Delivery error:', e.message));
  } catch (e) {
    console.error('completeOrder error:', e.message);
  }
}

// ============ YOOKASSA WEBHOOK ============
router.post('/webhook/yookassa', async (req, res) => {
  try {
    const event = req.body;
    if (event.type === 'payment.succeeded') {
      const orderId = event.object.metadata && event.object.metadata.order_id;
      if (orderId) {
        await completeOrder(orderId);
      }
    } else if (event.type === 'payment.canceled') {
      const orderId = event.object.metadata && event.object.metadata.order_id;
      if (orderId) {
        await pool.query('UPDATE orders SET status = "cancelled" WHERE id = ?', [orderId]);
      }
    }
    res.send('OK');
  } catch (e) {
    console.error('YooKassa webhook error:', e);
    res.status(500).send('Error');
  }
});

// ============ PLATEGA WEBHOOK ============
router.post('/webhook/platega', async (req, res) => {
  try {
    const data = req.body;
    const orderId = data.order_id || (data.metadata && data.metadata.order_id);

    if (data.status === 'success' || data.status === 'paid' || data.status === 'completed') {
      if (orderId) await completeOrder(orderId);
    } else if (data.status === 'cancel' || data.status === 'failed' || data.status === 'cancelled') {
      if (orderId) await pool.query('UPDATE orders SET status = "cancelled" WHERE id = ?', [orderId]);
    }

    res.send('OK');
  } catch (e) {
    console.error('Platega webhook error:', e);
    res.status(500).send('Error');
  }
});

// ============ UNITPAY WEBHOOK ============
router.post('/webhook/unitpay', async (req, res) => {
  try {
    const data = req.body;
    const method = data.method;
    const params = data.params || {};

    if (method === 'pay') {
      const orderId = params.account;
      const signature = params.signature;
      const secretKey = (await getAllSettings()).payment_unitpay_secret_key;

      if (!secretKey) {
        return res.json({ error: { message: 'UnitPay not configured' } });
      }

      // Verify signature
      const signStr = Object.keys(params)
        .filter(k => k !== 'signature')
        .sort()
        .map(k => `${k}=${params[k]}`)
        .join('&')
        .toLowerCase()
        .replace(/%20/g, '+')
        .replace(/%26/g, '&')
        .replace(/%3D/g, '=');

      const expectedSign = crypto
        .createHash('sha256')
        .update(`${signStr}${secretKey}`)
        .digest('hex');

      if (signature !== expectedSign) {
        console.error('UnitPay signature mismatch');
        return res.json({ error: { message: 'Invalid signature' } });
      }

      if (params.status === 'success' || params.status === 'completed') {
        await completeOrder(orderId);
        return res.json({ result: { message: 'Completed' } });
      }
    }

    res.json({ result: { message: 'Ignored' } });
  } catch (e) {
    console.error('UnitPay webhook error:', e);
    res.status(500).json({ error: { message: 'Internal error' } });
  }
});

// ============ FREEKASSA WEBHOOK ============
router.get('/webhook/freekassa', async (req, res) => {
  try {
    await processFreeKassa(req.query, req, res);
  } catch (e) {
    console.error('FreeKassa webhook error:', e);
    res.status(500).send('Error');
  }
});

router.post('/webhook/freekassa', async (req, res) => {
  try {
    await processFreeKassa(req.body, req, res);
  } catch (e) {
    console.error('FreeKassa webhook error:', e);
    res.status(500).send('Error');
  }
});

async function processFreeKassa(data, req, res) {
  const settings = await getAllSettings();
  const secret2 = settings.payment_freekassa_secret2;
  const merchantId = settings.payment_freekassa_shop_id;
  const orderId = data.ORDER_ID || data.order_id || data.MERCHANT_ORDER_ID || data.account;

  if (!orderId) return res.status(400).send('No order ID');

  const allowedIPs = ['168.119.157.24', '168.119.60.227', '138.201.88.124', '178.154.197.79'];
  const clientIP = req ? req.ip || req.connection?.remoteAddress : '';
  const isAllowedIP = allowedIPs.includes(clientIP) || allowedIPs.some(ip => clientIP.includes(ip));

  if (!isAllowedIP && secret2) {
    const sign = data.SIGN || data.sign;
    const expectedSign = crypto
      .createHash('md5')
      .update(`${merchantId}:${data.AMOUNT || data.amount}:${secret2}:${orderId}`)
      .digest('hex');

    if (sign && sign.toUpperCase() !== expectedSign.toUpperCase()) {
      console.error('FreeKassa signature mismatch');
      return res.status(403).send('Invalid signature');
    }
  }

  const status = data.STATUS || data.status || '1';
  if (status === '1' || status === 'success' || status === 'completed') {
    await completeOrder(orderId);
    res.send('YES');
  } else {
    res.status(400).send('Invalid status');
  }
}

// ============ SUCCESS PAGE ============
router.get('/success', async (req, res) => {
  const orderId = req.query.order;
  let order = null;
  if (orderId) {
    const [rows] = await pool.query('SELECT * FROM orders WHERE id = ?', [orderId]);
    order = rows[0] || null;

    if (order && order.status === 'pending') {
      const settings = await getAllSettings();
      let confirmed = true;

      if (order.payment_method === 'yookassa') {
        confirmed = false;
        try {
          const shopId = settings.payment_yookassa_shop_id;
          const secret = settings.payment_yookassa_secret;
          const paymentId = order.payment_id;
          if (shopId && secret && paymentId) {
            const auth = Buffer.from(`${shopId}:${secret}`).toString('base64');
            const resp = await fetch(`https://api.yookassa.ru/v3/payments/${paymentId}`, {
              headers: { 'Authorization': `Basic ${auth}` }
            });
            if (resp.ok) {
              const data = await resp.json();
              confirmed = data.status === 'succeeded';
            } else {
              confirmed = true;
            }
          } else {
            confirmed = true;
          }
        } catch (e) {
          console.error('YooKassa status check error:', e.message);
          confirmed = true;
        }
      } else if (order.payment_method === 'platega') {
        confirmed = false;
        try {
          const apiKey = settings.payment_platega_secret;
          const apiUrl = settings.payment_platega_api_url || 'https://api.platega.io/v1';
          const txnId = order.payment_id || orderId;

          if (apiKey) {
            const resp = await fetch(`${apiUrl}/payments/${txnId}`, {
              headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            if (resp.ok) {
              const data = await resp.json();
              const result = data.data || data;
              const status = (result.status || '').toLowerCase();
              confirmed = ['success', 'paid', 'completed', 'succeeded'].includes(status);
            } else {
              confirmed = true;
            }
          } else {
            confirmed = true;
          }
        } catch (e) {
          console.error('Platega status check error:', e.message);
          confirmed = true;
        }
      } else if (order.payment_method === 'unitpay') {
        confirmed = false;
        try {
          const publicKey = settings.payment_unitpay_public_key;
          const secretKey = settings.payment_unitpay_secret_key;
          if (publicKey && secretKey) {
            const resp = await fetch(`https://unitpay.money/api?method=getPayment&params[publicKey]=${publicKey}&params[account]=${order.id}`);
            if (resp.ok) {
              const data = await resp.json();
              confirmed = data.result?.status === 'success' || data.result?.status === 'completed';
            } else {
              confirmed = true;
            }
          } else {
            confirmed = true;
          }
        } catch (e) {
          console.error('UnitPay status check error:', e.message);
          confirmed = true;
        }
      } else if (order.payment_method === 'freekassa') {
        // Free-Kassa doesn't have a status API; rely on webhook
        confirmed = false;
      }

      if (confirmed) {
        await pool.query('UPDATE orders SET status = "completed" WHERE id = ? AND status = "pending"', [orderId]);
        const [rows2] = await pool.query('SELECT * FROM orders WHERE id = ?', [orderId]);
        order = rows2[0] || null;
        if (order && order.promo_code) {
          try { await pool.query('UPDATE promos SET used_count = used_count + 1 WHERE code = ?', [order.promo_code]); } catch(e) {}
        }
        if (order) deliverOrder(orderId).catch(e => console.error('Delivery error:', e.message));
      }
    }
  }
  const [siteSettings] = await pool.query('SELECT setting_key, setting_value FROM shop_settings');
  const s = {};
  siteSettings.forEach(row => { s[row.setting_key] = row.setting_value; });
  res.render('pay-success', { order, settings: s });
});

// ============ CANCEL PAGE ============
router.get('/cancel', async (req, res) => {
  const orderId = req.query.order;
  if (orderId) {
    await pool.query('UPDATE orders SET status = "cancelled" WHERE id = ? AND status = "pending"', [orderId]);
  }
  const [siteSettings] = await pool.query('SELECT setting_key, setting_value FROM shop_settings');
  const s = {};
  siteSettings.forEach(row => { s[row.setting_key] = row.setting_value; });
  res.render('pay-cancel', { orderId, settings: s });
});

module.exports = router;

// ============ BACKGROUND SCHEDULER ============
async function checkPendingOrders() {
  try {
    const [pending] = await pool.query(
      "SELECT * FROM orders WHERE status = 'pending' AND payment_method IS NOT NULL AND payment_method != '' AND created_at < NOW() - INTERVAL 2 MINUTE"
    );
    if (pending.length === 0) return;

    const settings = await getAllSettings();

    for (const order of pending) {
      try {
        let confirmed = false;

        if (order.payment_method === 'yookassa') {
          const shopId = settings.payment_yookassa_shop_id;
          const secret = settings.payment_yookassa_secret;
          const paymentId = order.payment_id;
          if (shopId && secret && paymentId) {
            const auth = Buffer.from(`${shopId}:${secret}`).toString('base64');
            const resp = await fetch(`https://api.yookassa.ru/v3/payments/${paymentId}`, {
              headers: { 'Authorization': `Basic ${auth}` }
            });
            if (resp.ok) {
              const data = await resp.json();
              confirmed = data.status === 'succeeded';
            }
          }
        } else if (order.payment_method === 'platega') {
          const apiKey = settings.payment_platega_secret;
          const apiUrl = settings.payment_platega_api_url || 'https://api.platega.io/v1';
          const txnId = order.payment_id || order.id;
          if (apiKey) {
            const resp = await fetch(`${apiUrl}/payments/${txnId}`, {
              headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            if (resp.ok) {
              const data = await resp.json();
              const result = data.data || data;
              const status = (result.status || '').toLowerCase();
              confirmed = ['success', 'paid', 'completed', 'succeeded'].includes(status);
            }
          }
        } else if (order.payment_method === 'unitpay') {
          const publicKey = settings.payment_unitpay_public_key;
          const secretKey = settings.payment_unitpay_secret_key;
          if (publicKey && secretKey) {
            try {
              const resp = await fetch(`https://unitpay.money/api?method=getPayment&params[publicKey]=${publicKey}&params[account]=${order.id}`);
              if (resp.ok) {
                const data = await resp.json();
                confirmed = data.result?.status === 'success' || data.result?.status === 'completed';
              }
            } catch (e) {
              console.error(`[Scheduler] UnitPay check error for ${order.id.slice(0,8)}:`, e.message);
            }
          }
        } else if (order.payment_method === 'freekassa') {
          // Free-Kassa doesn't have a public status API; cannot auto-check
        }

        if (confirmed) {
          await pool.query('UPDATE orders SET status = "completed" WHERE id = ? AND status = "pending"', [order.id]);
          if (order.promo_code) {
            try { await pool.query('UPDATE promos SET used_count = used_count + 1 WHERE code = ?', [order.promo_code]); } catch(e) {}
          }
          deliverOrder(order.id).catch(e => console.error('Scheduler delivery error:', e.message));
          console.log(`[Scheduler] Order ${order.id.slice(0,8)} auto-completed via ${order.payment_method}`);
        }
      } catch (e) {
        console.error(`[Scheduler] Check error for ${order.id.slice(0,8)}:`, e.message);
      }
    }
  } catch (e) {
    console.error('[Scheduler] Query error:', e.message);
  }
}

setInterval(checkPendingOrders, 60000);
checkPendingOrders();
