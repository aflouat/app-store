const http = require('http');
const https = require('https');
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

function sendWaitlistEmail(email, user_type) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return Promise.resolve();

  const isFreelance = user_type === 'freelance';
  const subject = isFreelance
    ? 'Vous êtes sur la liste — FreelanceHub vous ouvre bientôt ses portes'
    : 'Votre accès FreelanceHub est réservé — lancement le 30 avril';

  const html = isFreelance ? `
<!DOCTYPE html><html><body style="margin:0;font-family:Inter,Arial,sans-serif;background:#f8f9fa">
<div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
  <div style="background:#1a1a2e;padding:28px 36px">
    <span style="font-size:1.3rem;font-weight:700;color:#fff;letter-spacing:-.02em">perform<span style="color:#6366f1">-learn</span></span>
  </div>
  <div style="padding:36px">
    <h1 style="margin:0 0 12px;font-size:1.4rem;color:#111;font-weight:700">Bienvenue, consultant !</h1>
    <p style="color:#444;line-height:1.7;margin:0 0 20px">Vous êtes inscrit sur la liste d'attente <strong>FreelanceHub</strong> — la marketplace B2B qui connecte consultants experts et entreprises via un matching algorithmique, un paiement sécurisé par séquestre et un <strong>anonymat total jusqu'au paiement</strong>.</p>
    <div style="background:#f0f0ff;border-radius:8px;padding:20px;margin:0 0 24px">
      <p style="margin:0 0 8px;font-weight:700;color:#1a1a2e">Ce qui vous attend :</p>
      <ul style="margin:0;padding-left:18px;color:#444;line-height:2">
        <li>Profil vérifié (KYC) — crédibilité garantie</li>
        <li>Agenda en ligne — gérez vos disponibilités</li>
        <li>Paiement automatique à chaque séance</li>
        <li>Accès prioritaire early adopter (20 places)</li>
      </ul>
    </div>
    <div style="background:#1a1a2e;border-radius:8px;padding:16px 20px;text-align:center;margin:0 0 24px">
      <span style="color:#a5b4fc;font-size:.85rem;font-weight:600;letter-spacing:.05em;text-transform:uppercase">Lancement</span>
      <div style="color:#fff;font-size:1.5rem;font-weight:800;margin-top:4px">30 avril 2026</div>
    </div>
    <p style="color:#666;font-size:.88rem;line-height:1.6;margin:0">Nous vous contacterons dès l'ouverture pour finaliser votre profil. En attendant, si vous avez des questions, répondez simplement à cet email.</p>
  </div>
  <div style="padding:20px 36px;border-top:1px solid #f0f0f0;text-align:center">
    <p style="margin:0;font-size:.78rem;color:#999">perform-learn.fr · <a href="https://portal.perform-learn.fr/freelancehub/privacy" style="color:#6366f1;text-decoration:none">Politique de confidentialité</a></p>
  </div>
</div>
</body></html>` : `
<!DOCTYPE html><html><body style="margin:0;font-family:Inter,Arial,sans-serif;background:#f8f9fa">
<div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
  <div style="background:#1a1a2e;padding:28px 36px">
    <span style="font-size:1.3rem;font-weight:700;color:#fff;letter-spacing:-.02em">perform<span style="color:#6366f1">-learn</span></span>
  </div>
  <div style="padding:36px">
    <h1 style="margin:0 0 12px;font-size:1.4rem;color:#111;font-weight:700">Votre accès est réservé</h1>
    <p style="color:#444;line-height:1.7;margin:0 0 20px">Vous êtes inscrit sur la liste d'attente <strong>FreelanceHub</strong> — trouvez l'expert B2B qu'il vous faut, sans effort ni intermédiaire.</p>
    <div style="background:#f0f0ff;border-radius:8px;padding:20px;margin:0 0 24px">
      <p style="margin:0 0 8px;font-weight:700;color:#1a1a2e">Pourquoi FreelanceHub :</p>
      <ul style="margin:0;padding-left:18px;color:#444;line-height:2">
        <li>Consultants KYC vérifiés — zéro risque profil fictif</li>
        <li>Anonymat jusqu'au paiement — confidentialité totale</li>
        <li>Paiement séquestre — libéré après la séance</li>
        <li>Matching algorithmique — le bon expert en 2 min</li>
      </ul>
    </div>
    <div style="background:#1a1a2e;border-radius:8px;padding:16px 20px;text-align:center;margin:0 0 24px">
      <span style="color:#a5b4fc;font-size:.85rem;font-weight:600;letter-spacing:.05em;text-transform:uppercase">Lancement</span>
      <div style="color:#fff;font-size:1.5rem;font-weight:800;margin-top:4px">30 avril 2026</div>
    </div>
    <p style="color:#666;font-size:.88rem;line-height:1.6;margin:0">Nous vous contacterons dès l'ouverture pour vous donner accès à la plateforme. En attendant, si vous avez des questions, répondez simplement à cet email.</p>
  </div>
  <div style="padding:20px 36px;border-top:1px solid #f0f0f0;text-align:center">
    <p style="margin:0;font-size:.78rem;color:#999">perform-learn.fr · <a href="https://portal.perform-learn.fr/freelancehub/privacy" style="color:#6366f1;text-decoration:none">Politique de confidentialité</a></p>
  </div>
</div>
</body></html>`;

  const payload = JSON.stringify({
    from: 'FreelanceHub <noreply@perform-learn.fr>',
    to: [email],
    subject,
    html,
  });

  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'api.resend.com',
      path: '/emails',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (res) => {
      res.resume();
      res.on('end', resolve);
    });
    req.on('error', (err) => {
      console.error('[waitlist] email error:', err.message);
      resolve();
    });
    req.write(payload);
    req.end();
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
      const result = await pool.query(
        `INSERT INTO store.waitlist (email, user_type, marketing_consent, marketing_consent_at, source)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (email) DO UPDATE SET
           marketing_consent = EXCLUDED.marketing_consent,
           marketing_consent_at = EXCLUDED.marketing_consent_at
         RETURNING (xmax = 0) AS is_new`,
        [
          email,
          user_type,
          !!marketing_consent,
          marketing_consent ? new Date() : null,
          source || 'landing',
        ]
      );
      send(res, 201, { success: true });
      if (result.rows[0]?.is_new) {
        sendWaitlistEmail(email, user_type).catch(() => {});
      }
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
