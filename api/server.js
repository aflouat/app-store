const http = require('http');
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.PG_USER || 'appstore',
  password: process.env.PG_PASSWORD,
  host: 'postgres',
  port: 5432,
  database: 'appstore',
});

const ALLOWED_ORIGINS = [
  'https://perform-learn.fr',
  'https://www.perform-learn.fr',
  'https://portal.perform-learn.fr',
];

function setCorsHeaders(req, res) {
  const origin = req.headers.origin || '';
  const allowed =
    ALLOWED_ORIGINS.includes(origin) ||
    /^https:\/\/[^.]+\.vercel\.app$/.test(origin);
  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function send(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url.split('?')[0];

  // GET /health
  if (req.method === 'GET' && url === '/health') {
    try {
      await pool.query('SELECT 1');
      send(res, 200, { status: 'ok', db: 'connected' });
    } catch (err) {
      send(res, 503, { status: 'error', db: 'disconnected' });
    }
    return;
  }

  // POST /waitlist
  if (req.method === 'POST' && url === '/waitlist') {
    let body;
    try {
      body = JSON.parse(await readBody(req));
    } catch {
      send(res, 400, { error: 'Invalid JSON' });
      return;
    }

    const { email, user_type, marketing_consent, source } = body;
    if (!email || !user_type) {
      send(res, 400, { error: 'email and user_type are required' });
      return;
    }
    if (!['client', 'freelance'].includes(user_type)) {
      send(res, 400, { error: 'user_type must be client or freelance' });
      return;
    }

    try {
      await pool.query(
        `INSERT INTO store.waitlist (email, user_type, marketing_consent, marketing_consent_at, source)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (email) DO UPDATE SET
           marketing_consent = EXCLUDED.marketing_consent,
           marketing_consent_at = EXCLUDED.marketing_consent_at`,
        [
          email,
          user_type,
          !!marketing_consent,
          marketing_consent ? new Date() : null,
          source || 'landing',
        ]
      );
      send(res, 201, { success: true });
    } catch (err) {
      console.error('DB error:', err.message);
      send(res, 500, { error: 'Server error' });
    }
    return;
  }

  // GET /waitlist/stats
  if (req.method === 'GET' && url === '/waitlist/stats') {
    try {
      const result = await pool.query(
        `SELECT user_type, COUNT(*)::int AS count FROM store.waitlist GROUP BY user_type`
      );
      const stats = { client: 0, freelance: 0, total: 0 };
      for (const row of result.rows) {
        stats[row.user_type] = row.count;
        stats.total += row.count;
      }
      send(res, 200, stats);
    } catch (err) {
      console.error('DB error:', err.message);
      send(res, 500, { error: 'Server error' });
    }
    return;
  }

  // GET /apps
  if (req.method === 'GET' && url === '/apps') {
    try {
      const result = await pool.query(
        `SELECT id, slug, name, description, icon_url, version, status, url
         FROM store.apps
         WHERE status = 'published'
         ORDER BY name ASC`
      );
      send(res, 200, result.rows);
    } catch (err) {
      console.error('DB error:', err.message);
      send(res, 500, { error: 'Server error' });
    }
    return;
  }

  send(res, 404, { error: 'Not found' });
});

server.listen(3000, () => {
  console.log('API listening on port 3000');
});
