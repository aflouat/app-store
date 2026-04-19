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

  const results: Record<string, 'ok' | 'err' | 'missing'> = {
    db:     'err',
    minio:  'err',
    resend: 'missing',
    stripe: 'missing',
  }

  // DB ping
  try {
    await queryOne(`SELECT 1`, [])
    results.db = 'ok'
  } catch { results.db = 'err' }

  // MinIO ping
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
    results.minio = 'ok'
  } catch { results.minio = 'err' }

  // Resend key presence
  results.resend = process.env.RESEND_API_KEY ? 'ok' : 'missing'

  // Stripe key presence
  results.stripe = process.env.STRIPE_SECRET_KEY ? 'ok' : 'missing'

  const allOk = Object.values(results).every(v => v === 'ok')
  return NextResponse.json({ ok: allOk, checks: results }, { status: allOk ? 200 : 503 })
}
