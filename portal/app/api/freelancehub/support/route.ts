import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { Resend } from 'resend'

const SUPPORT_EMAIL = 'contact@perform-learn.fr'
const FROM = 'FreelanceHub <noreply@perform-learn.fr>'

const SUBJECTS: Record<string, string> = {
  technique:  'Problème technique',
  paiement:   'Paiement',
  compte:     'Mon compte',
  autre:      'Autre',
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const subject      = (body.subject      ?? '').trim()
  const message      = (body.message      ?? '').trim()
  const contactEmail = (body.contactEmail ?? '').trim()

  if (!subject || !message || !contactEmail) {
    return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
  }
  if (!(subject in SUBJECTS)) {
    return NextResponse.json({ error: 'Sujet invalide' }, { status: 400 })
  }
  if (message.length > 2000) {
    return NextResponse.json({ error: 'Message trop long (2000 car. max)' }, { status: 400 })
  }

  const subjectLabel = SUBJECTS[subject]
  const userName  = session.user.name  ?? contactEmail
  const userRole  = (session.user as { role?: string }).role ?? 'inconnu'

  const resend = new Resend(process.env.RESEND_API_KEY)

  // Email to support team
  await resend.emails.send({
    from:    FROM,
    to:      SUPPORT_EMAIL,
    replyTo: contactEmail,
    subject: `[Support FH] ${subjectLabel} — ${userName}`,
    html: `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><style>
  body { font-family: Arial, sans-serif; background: #f7f5f3; margin: 0; padding: 20px; }
  .card { background: #fff; border-radius: 12px; max-width: 540px; margin: 0 auto; padding: 28px; border: 1px solid #e2deda; }
  .label { font-size: 11px; font-weight: 700; color: #968e89; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 4px; }
  .value { font-size: 14px; color: #22201e; margin-bottom: 16px; }
  .message-box { background: #faf4f2; border-radius: 8px; padding: 14px 16px; font-size: 14px; color: #22201e; line-height: 1.6; white-space: pre-wrap; }
  .badge { display: inline-block; font-size: 11px; font-weight: 600; padding: .2em .6em; border-radius: 12px; background: #B9958D22; color: #B9958D; }
</style></head>
<body>
  <div class="card">
    <div style="font-size:13px;font-weight:700;color:#B9958D;margin-bottom:20px">FH · Support client</div>
    <div class="label">Sujet</div>
    <div class="value">${subjectLabel}</div>
    <div class="label">De</div>
    <div class="value">${userName} &lt;${contactEmail}&gt; <span class="badge">${userRole}</span></div>
    <div class="label">Message</div>
    <div class="message-box">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
  </div>
</body>
</html>`,
  })

  // Confirmation email to user
  await resend.emails.send({
    from:    FROM,
    to:      contactEmail,
    subject: 'FreelanceHub — Votre message a bien été reçu',
    html: `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><style>
  body { font-family: Arial, sans-serif; background: #f7f5f3; margin: 0; padding: 20px; }
  .card { background: #fff; border-radius: 12px; max-width: 520px; margin: 0 auto; padding: 32px; border: 1px solid #e2deda; }
  .logo { font-size: 15px; font-weight: 700; color: #B9958D; margin-bottom: 24px; }
  h1 { font-size: 20px; font-weight: 700; color: #22201e; margin: 0 0 12px; }
  p { font-size: 14px; color: #5c5956; line-height: 1.65; margin: 8px 0; }
  .footer { text-align: center; font-size: 11px; color: #968e89; margin-top: 24px; border-top: 1px solid #e2deda; padding-top: 16px; }
</style></head>
<body>
  <div class="card">
    <div class="logo">FH · FreelanceHub</div>
    <h1>Message reçu ✓</h1>
    <p>Bonjour ${userName},</p>
    <p>Votre message (<strong>${subjectLabel}</strong>) a bien été transmis à notre équipe support.</p>
    <p>Nous vous répondrons à l'adresse <strong>${contactEmail}</strong> dans les meilleurs délais (généralement sous 24h ouvrées).</p>
    <div class="footer">perform-learn.fr · FreelanceHub</div>
  </div>
</body>
</html>`,
  })

  return NextResponse.json({ ok: true })
}
