const http = require('http');
const https = require('https');

let cachedCount = 0;
let cachedMax = 0;
let cacheTime = 0;

async function getOnlineCount(serverIp) {
  if (!serverIp) return 0;
  if (Date.now() - cacheTime < 60000) return cachedCount;

  try {
    const data = await new Promise((resolve, reject) => {
      const url = `https://api.mcstatus.io/v2/status/java/${encodeURIComponent(serverIp)}`;
      const client = url.startsWith('https') ? https : http;
      const req = client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => {
          try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
        });
      });
      req.on('error', reject);
      req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
    });

    cachedCount = (data && data.players && data.players.online) || 0;
    cachedMax = (data && data.players && data.players.max) || 0;
    cacheTime = Date.now();
    return cachedCount;
  } catch (e) {
    return 0;
  }
}

module.exports = { getOnlineCount, getOnlineMax: () => cachedMax };