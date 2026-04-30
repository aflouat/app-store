/**
 * Script d'envoi de l'email de lancement à la waitlist.
 * Usage : npx tsx portal/scripts/launch-email.ts [--dry-run]
 *
 * Prérequis : DATABASE_URL et RESEND_API_KEY dans l'environnement
 */

import 'dotenv/config'
import { Pool } from 'pg'
import { Resend } from 'resend'

const isDryRun = process.argv.includes('--dry-run')

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 })

const FROM = 'FreelanceHub <noreply@perform-learn.fr>'
const BASE = 'https://portal.perform-learn.fr'

interface WaitlistRow {
  email: string
  name: string | null
  user_type: string
  source: string | null
}

async function main() {
  const { rows } = await pool.query<WaitlistRow>(
    `SELECT email, name, user_type, source
     FROM store.waitlist
     WHERE marketing_consent = true
     ORDER BY created_at ASC`
  )

  console.log(`[launch-email] ${rows.length} destinataires (marketing_consent=true)`)
  if (isDryRun) {
    console.log('[launch-email] DRY RUN — aucun email envoyé')
    rows.slice(0, 5).forEach(r => console.log(`  ${r.email} (${r.user_type})`))
    if (rows.length > 5) console.log(`  ... et ${rows.length - 5} autres`)
    await pool.end()
    return
  }

  const resend = new Resend(process.env.RESEND_API_KEY!)
  const consultants = rows.filter(r => r.user_type === 'freelance' || r.user_type === 'consultant')
  const clients     = rows.filter(r => r.user_type === 'client')

  let sent = 0
  let failed = 0

  // Batch de 50 par minute (limite Resend tier gratuit)
  const BATCH = 50
  const DELAY_MS = 60_000

  const allSegmented = [
    ...consultants.map(r => ({ ...r, segment: 'consultant' as const })),
    ...clients.map(r => ({ ...r, segment: 'client' as const })),
  ]

  for (let i = 0; i < allSegmented.length; i++) {
    const r = allSegmented[i]

    if (i > 0 && i % BATCH === 0) {
      console.log(`[launch-email] Pause 60s (rate limit Resend)… (${i}/${allSegmented.length})`)
      await new Promise(res => setTimeout(res, DELAY_MS))
    }

    const name = r.name ?? ''
    const isConsultant = r.segment === 'consultant'

    try {
      await resend.emails.send({
        from: FROM,
        to: r.email,
        subject: isConsultant
          ? '[perform-learn.fr] C\'est live — places Fondateur ouvertes'
          : '[perform-learn.fr] Consultants ERP/D365/SAP vérifiés — accès immédiat',
        html: isConsultant
          ? buildConsultantHtml(name)
          : buildClientHtml(name),
      })
      sent++
      if (sent % 10 === 0) console.log(`[launch-email] ${sent} envoyés…`)
    } catch (err) {
      failed++
      console.error(`[launch-email] Échec ${r.email}:`, err)
    }
  }

  console.log(`[launch-email] Terminé — ${sent} envoyés, ${failed} échecs`)
  await pool.end()
}

function buildConsultantHtml(name: string): string {
  const greeting = name ? `Bonjour ${name},` : 'Bonjour,'
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><style>
    body{font-family:Arial,sans-serif;background:#f7f5f3;margin:0;padding:20px}
    .card{background:#fff;border-radius:12px;max-width:520px;margin:0 auto;padding:32px;border:1px solid #e2deda}
    .logo{font-size:15px;font-weight:700;color:#B9958D;margin-bottom:28px}
    h1{font-size:20px;font-weight:700;color:#22201e;margin:0 0 16px}
    p{font-size:14px;color:#5c5956;line-height:1.65;margin:8px 0}
    .box{background:#faf4f2;border-radius:8px;padding:16px;margin:16px 0;border-left:3px solid #b45309}
    .row{display:flex;justify-content:space-between;font-size:13px;padding:4px 0}
    .cta{display:inline-block;background:#B9958D;color:#fff;text-decoration:none;border-radius:8px;padding:12px 24px;font-size:14px;font-weight:600;margin-top:20px}
    .footer{text-align:center;font-size:11px;color:#968e89;margin-top:24px;border-top:1px solid #e2deda;padding-top:16px}
  </style></head><body><div class="card">
    <div class="logo">FH · FreelanceHub</div>
    <h1>perform-learn.fr est en ligne ✓</h1>
    <p>${greeting}</p>
    <p>C'est le moment d'agir — les places Fondateur partent vite.</p>
    <div class="box">
      <p style="font-size:13px;font-weight:700;color:#b45309;margin:0 0 8px">★ PLACES FONDATEUR LIMITÉES</p>
      <p style="font-size:13px;color:#5c5956;margin:0">
        Les 20 premiers consultants KYC validés obtiennent :<br>
        — Commission <strong>10% à vie</strong> (vs 15% standard)<br>
        — Badge <strong>Fondateur</strong> visible sur votre profil
      </p>
    </div>
    <div style="background:#f0f0f0;border-radius:8px;padding:16px;margin:16px 0">
      <div class="row"><span style="color:#968e89">Étape 1</span><span>Créer votre compte</span></div>
      <div class="row"><span style="color:#968e89">Étape 2</span><span>Compléter votre profil</span></div>
      <div class="row"><span style="color:#968e89">Étape 3</span><span>Soumettre votre KYC (48h)</span></div>
    </div>
    <a href="${BASE}/freelancehub/register" class="cta">Créer mon compte Fondateur →</a>
    <div class="footer">
      perform-learn.fr · <a href="mailto:contact@perform-learn.fr" style="color:#B9958D">contact@perform-learn.fr</a><br>
      <a href="${BASE}/freelancehub/unsubscribe" style="color:#968e89">Se désabonner</a>
    </div>
  </div></body></html>`
}

function buildClientHtml(name: string): string {
  const greeting = name ? `Bonjour ${name},` : 'Bonjour,'
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><style>
    body{font-family:Arial,sans-serif;background:#f7f5f3;margin:0;padding:20px}
    .card{background:#fff;border-radius:12px;max-width:520px;margin:0 auto;padding:32px;border:1px solid #e2deda}
    .logo{font-size:15px;font-weight:700;color:#B9958D;margin-bottom:28px}
    h1{font-size:20px;font-weight:700;color:#22201e;margin:0 0 16px}
    p{font-size:14px;color:#5c5956;line-height:1.65;margin:8px 0}
    .box{background:#faf4f2;border-radius:8px;padding:16px;margin:16px 0}
    .row{display:flex;justify-content:space-between;font-size:13px;padding:4px 0}
    .cta{display:inline-block;background:#B9958D;color:#fff;text-decoration:none;border-radius:8px;padding:12px 24px;font-size:14px;font-weight:600;margin-top:20px}
    .footer{text-align:center;font-size:11px;color:#968e89;margin-top:24px;border-top:1px solid #e2deda;padding-top:16px}
  </style></head><body><div class="card">
    <div class="logo">FH · FreelanceHub</div>
    <h1>perform-learn.fr est opérationnel ✓</h1>
    <p>${greeting}</p>
    <p>Trouvez votre consultant expert en 5 minutes.</p>
    <div class="box">
      <div class="row"><span style="color:#968e89">✓ KYC vérifié</span><span>KBIS ou URSSAF obligatoire</span></div>
      <div class="row"><span style="color:#968e89">✓ Paiement séquestre</span><span>Libéré après votre validation</span></div>
      <div class="row"><span style="color:#968e89">✓ Commission 15%</span><span>vs 25-40% en agence</span></div>
      <div class="row"><span style="color:#968e89">✓ Sans engagement</span><span>À l'heure, pas de contrat long</span></div>
    </div>
    <p style="font-size:13px;color:#968e89">Domaines : ERP D365, SAP, Supply Chain, Management, Data, Formation.</p>
    <a href="${BASE}/freelancehub/register" class="cta">Accéder à la plateforme →</a>
    <div class="footer">
      perform-learn.fr · <a href="mailto:contact@perform-learn.fr" style="color:#B9958D">contact@perform-learn.fr</a><br>
      <a href="${BASE}/freelancehub/unsubscribe" style="color:#968e89">Se désabonner</a>
    </div>
  </div></body></html>`
}

main().catch(err => { console.error(err); process.exit(1) })
