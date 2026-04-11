// lib/freelancehub/email.ts — SERVER ONLY
// Resend integration for transactional emails

import { Resend } from 'resend'

// Lazy init — avoids build-time error when RESEND_API_KEY is not set
function getResend(): Resend {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY is not configured')
  return new Resend(key)
}

const FROM  = 'FreelanceHub <noreply@perform-learn.fr>'
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
  const dateStr = new Date(info.slotDate + 'T00:00:00').toLocaleDateString('fr-FR', {
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
  const dateStr = new Date(info.slotDate + 'T00:00:00').toLocaleDateString('fr-FR', {
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
