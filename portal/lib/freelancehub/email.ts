// lib/freelancehub/email.ts — SERVER ONLY
// Resend integration for transactional emails

import { Resend } from 'resend'

// Lazy init — avoids build-time error when RESEND_API_KEY is not set
function getResend(): Resend {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY is not configured')
  return new Resend(key)
}

const FROM       = 'FreelanceHub <noreply@perform-learn.fr>'
const FROM_DG    = 'Agent DG perform-learn.fr <noreply@perform-learn.fr>'
const BASE  = process.env.NEXTAUTH_URL ?? 'https://portal.perform-learn.fr'

// ─── Types ────────────────────────────────────────────────────

interface BookingInfo {
  bookingId:        string
  clientName:       string
  clientEmail:      string
  consultantName:   string
  consultantEmail:  string
  skillName:        string
  slotDate:         string   // ISO date
  slotTime:         string   // HH:MM
  amountHt:         number   // centimes
}

// ─── Email senders ────────────────────────────────────────────

export async function sendBookingConfirmation(info: BookingInfo) {
  const amount = (info.amountHt / 100).toFixed(0)
  const dateStr = new Date(info.slotDate + 'T00:00:00Z').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  // Email client
  await getResend().emails.send({
    from:    FROM,
    to:      info.clientEmail,
    subject: `FreelanceHub — Réservation confirmée : ${info.skillName}`,
    html:    buildClientConfirmEmail({ ...info, dateStr, amount }),
  })

  // Email consultant (reveal)
  await getResend().emails.send({
    from:    FROM,
    to:      info.consultantEmail,
    subject: `FreelanceHub — Nouvelle mission : ${info.skillName} le ${dateStr}`,
    html:    buildConsultantNotifEmail({ ...info, dateStr, amount }),
  })
}

export async function sendBookingReminder(info: BookingInfo) {
  const dateStr = new Date(info.slotDate + 'T00:00:00Z').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  await getResend().emails.send({
    from:    FROM,
    to:      info.clientEmail,
    subject: `FreelanceHub — Rappel : votre mission demain à ${info.slotTime}`,
    html:    buildReminderEmail({ ...info, dateStr }),
  })

  await getResend().emails.send({
    from:    FROM,
    to:      info.consultantEmail,
    subject: `FreelanceHub — Rappel : mission demain à ${info.slotTime}`,
    html:    buildReminderEmail({ ...info, dateStr, isConsultant: true }),
  })
}

export async function sendReviewRequest(
  bookingId: string,
  userEmail: string,
  userName:  string,
  role:      'client' | 'consultant'
) {
  const reviewUrl = role === 'client'
    ? `${BASE}/freelancehub/client/reviews/${bookingId}`
    : `${BASE}/freelancehub/consultant/bookings/${bookingId}/review`

  await getResend().emails.send({
    from:    FROM,
    to:      userEmail,
    subject: 'FreelanceHub — Évaluez votre mission',
    html:    buildReviewRequestEmail({ userName, reviewUrl }),
  })
}

export async function sendFundRelease(
  consultantEmail: string,
  consultantName:  string,
  amount:          number,   // centimes
  bookingId:       string
) {
  await getResend().emails.send({
    from:    FROM,
    to:      consultantEmail,
    subject: `FreelanceHub — Paiement versé : ${(amount / 100).toFixed(0)} €`,
    html:    buildFundReleaseEmail({ consultantName, amount, bookingId }),
  })
}

// ─── Agent DG — Task notification ────────────────────────────

export interface AgentTask {
  id:          string   // ex: "T-001"
  title:       string
  description: string
  duration:    string   // ex: "15 min"
  tool?:       string   // ex: "Brevo", "Navigateur"
  deadline?:   string   // ex: "avant le 27/04"
  actionUrl?:  string   // lien direct si applicable
}

const AGENT_EMAILS: Record<string, { name: string; email: string }> = {
  abdel:    { name: 'Abdel',            email: 'aflouat@gmail.com' },
  aminetou: { name: 'Mme Aminetou',     email: 'minetou1987@gmail.com' },
}

export async function sendTaskNotifications(
  assignee: 'abdel' | 'aminetou',
  tasks:    AgentTask[],
  sprintLabel: string   // ex: "Sprint 19-25 avril 2026"
) {
  const agent = AGENT_EMAILS[assignee]
  if (!agent) throw new Error(`Assignee inconnu : ${assignee}`)

  const result = await getResend().emails.send({
    from:    FROM_DG,
    to:      agent.email,
    subject: `[perform-learn.fr] ${tasks.length} tache${tasks.length > 1 ? 's' : ''} - ${sprintLabel}`,
    html:    buildTaskEmail({ agentName: agent.name, tasks, sprintLabel }),
  })
  if (result.error) throw new Error(`Resend error: ${JSON.stringify(result.error)}`)
}

function buildTaskEmail(d: {
  agentName:   string
  tasks:       AgentTask[]
  sprintLabel: string
}): string {
  const taskRows = d.tasks.map(t => `
    <div class="task-card">
      <div class="task-id">${t.id}</div>
      <div class="task-title">${t.title}</div>
      <p class="task-desc">${t.description}</p>
      <div class="task-meta">
        <span>⏱ ${t.duration}</span>
        ${t.tool    ? `<span>🛠 ${t.tool}</span>` : ''}
        ${t.deadline ? `<span>📅 ${t.deadline}</span>` : ''}
      </div>
      ${t.actionUrl ? `<a href="${t.actionUrl}" class="task-link">Accéder →</a>` : ''}
    </div>
  `).join('')

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #f7f5f3; margin: 0; padding: 20px; }
    .card { background: #fff; border-radius: 12px; max-width: 540px; margin: 0 auto; padding: 32px; border: 1px solid #e2deda; }
    .logo { font-size: 13px; font-weight: 700; color: #B9958D; margin-bottom: 8px; letter-spacing: .03em; }
    .sprint { font-size: 11px; color: #968e89; margin-bottom: 24px; }
    h1 { font-size: 18px; font-weight: 700; color: #22201e; margin: 0 0 6px; }
    .intro { font-size: 13px; color: #5c5956; line-height: 1.6; margin-bottom: 20px; }
    .task-card { background: #faf4f2; border-radius: 8px; padding: 14px 16px; margin-bottom: 12px; border-left: 3px solid #B9958D; }
    .task-id { font-size: 10px; font-weight: 700; color: #B9958D; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 4px; }
    .task-title { font-size: 14px; font-weight: 700; color: #22201e; margin-bottom: 6px; }
    .task-desc { font-size: 13px; color: #5c5956; line-height: 1.55; margin: 0 0 8px; }
    .task-meta { display: flex; gap: 12px; flex-wrap: wrap; font-size: 12px; color: #968e89; }
    .task-link { display: inline-block; margin-top: 8px; font-size: 12px; font-weight: 600; color: #B9958D; text-decoration: none; }
    .footer { text-align: center; font-size: 11px; color: #968e89; margin-top: 24px; border-top: 1px solid #e2deda; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">perform-learn.fr · Agent DG</div>
    <div class="sprint">${d.sprintLabel}</div>
    <h1>Bonjour ${d.agentName},</h1>
    <p class="intro">
      Voici vos tâches préparées pour ce sprint. Chaque tâche est prête à 90% —
      votre action est clairement identifiée.
    </p>
    ${taskRows}
    <div class="footer">
      perform-learn.fr · <a href="mailto:contact@perform-learn.fr" style="color:#B9958D">Répondre à l'Agent DG</a>
    </div>
  </div>
</body>
</html>`
}

// ─── Welcome + KYC emails ─────────────────────────────────────

export async function sendWelcomeConsultant(email: string, name: string) {
  await getResend().emails.send({
    from:    FROM,
    to:      email,
    subject: `Bienvenue sur FreelanceHub, ${name || 'Expert'} !`,
    html:    buildWelcomeConsultantEmail({ name: name || 'Expert' }),
  })
}

export async function sendKycValidated(email: string, name: string, isEarlyAdopter: boolean) {
  await getResend().emails.send({
    from:    FROM,
    to:      email,
    subject: '✓ KYC validé — vous êtes maintenant visible sur FreelanceHub',
    html:    buildKycValidatedEmail({ name: name || 'Consultant', isEarlyAdopter }),
  })
}

export async function sendKycRejected(email: string, name: string, notes: string) {
  await getResend().emails.send({
    from:    FROM,
    to:      email,
    subject: 'KYC refusé — action requise sur FreelanceHub',
    html:    buildKycRejectedEmail({ name: name || 'Consultant', notes }),
  })
}

// ─── HTML templates ───────────────────────────────────────────

function baseTemplate(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #f7f5f3; margin: 0; padding: 20px; }
    .card { background: #fff; border-radius: 12px; max-width: 520px; margin: 0 auto; padding: 32px; border: 1px solid #e2deda; }
    .logo { font-size: 15px; font-weight: 700; color: #B9958D; margin-bottom: 28px; letter-spacing: .03em; }
    h1 { font-size: 20px; font-weight: 700; color: #22201e; margin: 0 0 16px; }
    p { font-size: 14px; color: #5c5956; line-height: 1.65; margin: 8px 0; }
    .info-box { background: #faf4f2; border-radius: 8px; padding: 16px; margin: 16px 0; }
    .info-row { display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; }
    .info-row span:first-child { color: #968e89; }
    .info-row span:last-child { font-weight: 600; color: #22201e; }
    .cta { display: inline-block; background: #B9958D; color: #fff; text-decoration: none; border-radius: 8px; padding: 12px 24px; font-size: 14px; font-weight: 600; margin-top: 20px; }
    .footer { text-align: center; font-size: 11px; color: #968e89; margin-top: 24px; }
    hr { border: none; border-top: 1px solid #e2deda; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">FH · FreelanceHub</div>
    ${body}
    <div class="footer">perform-learn.fr · <a href="${BASE}/freelancehub" style="color:#B9958D">Mon espace</a></div>
  </div>
</body>
</html>`
}

function buildClientConfirmEmail(d: {
  clientName: string; skillName: string; dateStr: string; slotTime: string;
  amount: string; bookingId: string;
}): string {
  return baseTemplate('Réservation confirmée', `
    <h1>Réservation confirmée ✓</h1>
    <p>Bonjour ${d.clientName},</p>
    <p>Votre réservation a bien été prise en compte. Votre expert vous contactera prochainement.</p>
    <div class="info-box">
      <div class="info-row"><span>Expertise</span><span>${d.skillName}</span></div>
      <div class="info-row"><span>Date</span><span>${d.dateStr}</span></div>
      <div class="info-row"><span>Heure</span><span>${d.slotTime}</span></div>
      <div class="info-row"><span>Montant HT</span><span>${d.amount} €</span></div>
    </div>
    <a href="${BASE}/freelancehub/client/bookings" class="cta">Voir ma réservation</a>
  `)
}

function buildConsultantNotifEmail(d: {
  consultantName: string; clientName: string; skillName: string;
  dateStr: string; slotTime: string; amount: string;
}): string {
  return baseTemplate('Nouvelle mission', `
    <h1>Nouvelle mission confirmée</h1>
    <p>Bonjour ${d.consultantName},</p>
    <p>Une mission vous a été assignée via le matching FreelanceHub.</p>
    <div class="info-box">
      <div class="info-row"><span>Expertise demandée</span><span>${d.skillName}</span></div>
      <div class="info-row"><span>Date</span><span>${d.dateStr}</span></div>
      <div class="info-row"><span>Heure</span><span>${d.slotTime}</span></div>
      <div class="info-row"><span>Votre rémunération</span><span>${Math.round(Number(d.amount) * 0.85)} € net</span></div>
    </div>
    <a href="${BASE}/freelancehub/consultant/bookings" class="cta">Voir mes réservations</a>
  `)
}

function buildReminderEmail(d: {
  clientName?: string; consultantName?: string;
  skillName: string; dateStr: string; slotTime: string;
  isConsultant?: boolean;
}): string {
  const name = d.isConsultant ? d.consultantName : d.clientName
  return baseTemplate('Rappel mission demain', `
    <h1>Rappel — Mission demain</h1>
    <p>Bonjour ${name ?? ''},</p>
    <p>Rappel : votre mission <strong>${d.skillName}</strong> a lieu demain.</p>
    <div class="info-box">
      <div class="info-row"><span>Date</span><span>${d.dateStr}</span></div>
      <div class="info-row"><span>Heure</span><span>${d.slotTime}</span></div>
    </div>
    <a href="${BASE}/freelancehub" class="cta">Mon espace FreelanceHub</a>
  `)
}

function buildReviewRequestEmail(d: { userName: string; reviewUrl: string }): string {
  return baseTemplate('Évaluez votre mission', `
    <h1>Partagez votre expérience</h1>
    <p>Bonjour ${d.userName},</p>
    <p>Votre mission est terminée. Prenez 2 minutes pour évaluer votre expérience — vos avis aident à améliorer la qualité du matching.</p>
    <a href="${d.reviewUrl}" class="cta">Laisser mon avis →</a>
    <hr>
    <p style="font-size:12px;color:#968e89">Ce lien expire dans 7 jours.</p>
  `)
}

function buildFundReleaseEmail(d: {
  consultantName: string; amount: number; bookingId: string;
}): string {
  const net = (d.amount / 100).toFixed(0)
  return baseTemplate('Paiement versé', `
    <h1>Paiement versé ✓</h1>
    <p>Bonjour ${d.consultantName},</p>
    <p>Le paiement de votre mission a été libéré et transféré sur votre compte.</p>
    <div class="info-box">
      <div class="info-row"><span>Montant net versé</span><span>${net} €</span></div>
      <div class="info-row"><span>Référence mission</span><span>${d.bookingId.slice(0,8).toUpperCase()}</span></div>
    </div>
    <a href="${BASE}/freelancehub/consultant/earnings" class="cta">Voir mes gains</a>
  `)
}

function buildWelcomeConsultantEmail(d: { name: string }): string {
  return baseTemplate('Bienvenue sur FreelanceHub', `
    <h1>Bienvenue, ${d.name} !</h1>
    <p>Votre compte consultant FreelanceHub est créé. Vous êtes à 3 étapes d'apparaître dans les résultats et de recevoir vos premières missions.</p>
    <div class="info-box">
      <div class="info-row"><span>Étape 1</span><span>Complétez votre profil</span></div>
      <div class="info-row"><span>Étape 2</span><span>Soumettez votre KYC (KBIS ou URSSAF)</span></div>
      <div class="info-row"><span>Étape 3</span><span>Ajoutez vos créneaux disponibles</span></div>
    </div>
    <p style="font-size:12px;color:#b45309;font-weight:600">Les 20 premiers consultants validés KYC obtiennent le badge Fondateur et une commission réduite à 10%.</p>
    <a href="${BASE}/freelancehub/consultant/kyc" class="cta">Soumettre mon KYC →</a>
  `)
}

function buildKycValidatedEmail(d: { name: string; isEarlyAdopter: boolean }): string {
  const earlyBlock = d.isEarlyAdopter
    ? `<div class="info-box" style="border-left:3px solid #b45309">
        <p style="font-size:13px;font-weight:700;color:#b45309;margin:0">★ Vous êtes Early Adopter — Fondateur</p>
        <p style="font-size:12px;color:#5c5956;margin:6px 0 0">Commission réduite à 10% sur toutes vos missions. Badge Fondateur affiché sur votre profil.</p>
      </div>`
    : ''
  return baseTemplate('KYC validé', `
    <h1>KYC validé ✓</h1>
    <p>Bonjour ${d.name},</p>
    <p>Votre dossier KYC a été vérifié et validé. Votre profil est maintenant <strong>actif et visible</strong> dans les résultats de recherche FreelanceHub.</p>
    ${earlyBlock}
    <p>Ajoutez dès maintenant vos créneaux disponibles pour recevoir vos premières réservations.</p>
    <a href="${BASE}/freelancehub/consultant/agenda" class="cta">Gérer mon agenda →</a>
  `)
}

function buildKycRejectedEmail(d: { name: string; notes: string }): string {
  return baseTemplate('KYC refusé', `
    <h1>KYC refusé — action requise</h1>
    <p>Bonjour ${d.name},</p>
    <p>Votre dossier KYC n'a pas pu être validé pour la raison suivante :</p>
    <div class="info-box" style="border-left:3px solid #c0392b">
      <p style="font-size:13px;color:#c0392b;margin:0">${d.notes}</p>
    </div>
    <p>Soumettez un nouveau document depuis votre espace consultant.</p>
    <a href="${BASE}/freelancehub/consultant/kyc" class="cta">Re-soumettre mon KYC →</a>
  `)
}

// ─── Email de lancement waitlist ─────────────────────────────

export async function sendLaunchEmail(
  email:    string,
  name:     string,
  userType: 'consultant' | 'client'
) {
  const isConsultant = userType === 'consultant'
  const subject = isConsultant
    ? '[perform-learn.fr] C\'est live — places Fondateur ouvertes'
    : '[perform-learn.fr] Consultants ERP/D365/SAP vérifiés — accès immédiat'

  await getResend().emails.send({
    from:    FROM,
    to:      email,
    subject,
    html:    isConsultant
      ? buildLaunchConsultantEmail({ name: name || 'Expert' })
      : buildLaunchClientEmail({ name: name || '' }),
  })
}

function buildLaunchConsultantEmail(d: { name: string }): string {
  return baseTemplate('C\'est live — places Fondateur ouvertes', `
    <h1>perform-learn.fr est en ligne ✓</h1>
    <p>Bonjour ${d.name},</p>
    <p>Vous avez rejoint notre liste d'attente. C'est le moment d'agir.</p>
    <div class="info-box" style="border-left:3px solid #b45309">
      <p style="font-size:13px;font-weight:700;color:#b45309;margin:0 0 8px">★ PLACES FONDATEUR LIMITÉES</p>
      <p style="font-size:13px;color:#5c5956;margin:0">Les 20 premiers consultants KYC validés obtiennent :<br>
      — Commission <strong>10% à vie</strong> (vs 15% standard)<br>
      — Badge <strong>Fondateur</strong> visible sur votre profil<br>
      — Priorité dans le matching</p>
    </div>
    <p>L'inscription prend 10 minutes :</p>
    <div class="info-box">
      <div class="info-row"><span>Étape 1</span><span>Créez votre compte (email ou Google)</span></div>
      <div class="info-row"><span>Étape 2</span><span>Complétez votre profil + compétences</span></div>
      <div class="info-row"><span>Étape 3</span><span>Soumettez votre KYC — validation 48h</span></div>
    </div>
    <a href="${BASE}/freelancehub/register" class="cta">Créer mon compte Fondateur →</a>
    <hr>
    <p style="font-size:12px;color:#968e89">Questions : <a href="mailto:contact@perform-learn.fr" style="color:#B9958D">contact@perform-learn.fr</a></p>
  `)
}

function buildLaunchClientEmail(d: { name: string }): string {
  const greeting = d.name ? `Bonjour ${d.name},` : 'Bonjour,'
  return baseTemplate('Consultants B2B vérifiés — perform-learn.fr', `
    <h1>perform-learn.fr est opérationnel ✓</h1>
    <p>${greeting}</p>
    <p>Trouvez votre consultant expert en 5 minutes — sans les frictions habituelles.</p>
    <div class="info-box">
      <div class="info-row"><span>✓ KYC vérifié</span><span>KBIS ou URSSAF obligatoire</span></div>
      <div class="info-row"><span>✓ Paiement séquestre</span><span>Libéré après votre validation</span></div>
      <div class="info-row"><span>✓ Commission 15%</span><span>vs 25-40% en agence</span></div>
      <div class="info-row"><span>✓ Sans engagement</span><span>À l'heure, pas de contrat long</span></div>
    </div>
    <p>Domaines disponibles : ERP D365, SAP, Supply Chain, Management de projet, Data, Formation.</p>
    <a href="${BASE}/freelancehub/register" class="cta">Accéder à la plateforme →</a>
    <hr>
    <p style="font-size:12px;color:#968e89">Questions : <a href="mailto:contact@perform-learn.fr" style="color:#B9958D">contact@perform-learn.fr</a></p>
  `)
}
