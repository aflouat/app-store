import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { queryOne } from '@/lib/freelancehub/db'
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3'

// GET /api/govern/smoke-test
// Auth: Bearer <CRON_SECRET> or admin session
export async function GET(req: NextRequest) {
  const secret   = process.env.CRON_SECRET
  const bearer   = req.headers.get('authorization')
  const cronOk   = secret && bearer === `Bearer ${secret}`

  if (!cronOk) {
    const session = await auth()
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const checks: Record<string, 'ok' | 'err' | 'missing' | 'invalid'> = {
    db:                       'err',
    resend:                   'missing',
    stripe_secret:            'missing',
    stripe_publishable:       'missing',
    stripe_publishable_format: 'missing',
    stripe_pi:                'err',
    minio:                    'err',   // optional — VPS only
  }

  // DB ping
  try {
    await queryOne(`SELECT 1`, [])
    checks.db = 'ok'
  } catch { checks.db = 'err' }

  // Resend key presence
  checks.resend = process.env.RESEND_API_KEY ? 'ok' : 'missing'

  // Stripe keys presence + format validation
  const sk = process.env.STRIPE_SECRET_KEY ?? ''
  const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ''
  checks.stripe_secret      = sk ? 'ok' : 'missing'
  checks.stripe_publishable = pk ? 'ok' : 'missing'
  if (pk) {
    checks.stripe_publishable_format = pk.startsWith('pk_') ? 'ok' : 'invalid'
  }

  // Stripe live test : create + cancel a PaymentIntent
  if (sk) {
    try {
      const Stripe = (await import('stripe')).default
      const stripe = new Stripe(sk)
      const pi = await stripe.paymentIntents.create({
        amount: 100, currency: 'eur',
        automatic_payment_methods: { enabled: true },
        metadata: { smoke_test: 'true' },
        description: 'smoke-test — annulé immédiatement',
      })
      await stripe.paymentIntents.cancel(pi.id)
      checks.stripe_pi = 'ok'
    } catch { checks.stripe_pi = 'err' }
  } else {
    checks.stripe_pi = 'missing'
  }

  // MinIO ping — optional (VPS service, not available from Vercel serverless)
  try {
    const BUCKET = (process.env.MINIO_BUCKET_KYC ?? '').trim() || 'kyc-documents'
    const s3 = new S3Client({
      endpoint:         process.env.MINIO_ENDPOINT,
      region:           'eu-west-1',
      credentials: {
        accessKeyId:     process.env.MINIO_ACCESS_KEY ?? '',
        secretAccessKey: process.env.MINIO_SECRET_KEY ?? '',
      },
      forcePathStyle: true,
    })
    await s3.send(new HeadBucketCommand({ Bucket: BUCKET }))
    checks.minio = 'ok'
  } catch { checks.minio = 'err' }

  // ok = only critical checks (minio is optional)
  const CRITICAL = ['db', 'resend', 'stripe_secret', 'stripe_publishable', 'stripe_publishable_format', 'stripe_pi']
  const allOk = CRITICAL.every(k => checks[k] === 'ok')

  return NextResponse.json({ ok: allOk, checks }, { status: allOk ? 200 : 503 })
}
