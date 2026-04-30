import { NextRequest, NextResponse } from 'next/server'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { auth } from '@/auth'

const s3 = new S3Client({
  endpoint:       process.env.MINIO_ENDPOINT,
  region:         'us-east-1',
  forcePathStyle: true,
  credentials: {
    accessKeyId:     process.env.MINIO_ACCESS_KEY!,
    secretAccessKey: process.env.MINIO_SECRET_KEY!,
  },
})

const BUCKET = (process.env.MINIO_BUCKET_KYC ?? '').trim() || 'kyc-documents'

// GET /api/freelancehub/admin/kyc-presign?docUrl=<encoded>
// Génère une URL signée valable 15 min pour visualiser un doc KYC privé
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const docUrl = req.nextUrl.searchParams.get('docUrl')
  if (!docUrl) {
    return NextResponse.json({ error: 'docUrl requis.' }, { status: 400 })
  }

  // Extraire la clé S3 à partir de l'URL stockée
  // Format: https://s3.perform-learn.fr/kyc-documents/kyc/<id>/<file>
  const bucketPrefix = `/${BUCKET}/`
  const keyStart = docUrl.indexOf(bucketPrefix)
  if (keyStart === -1) {
    return NextResponse.json({ error: 'URL de document invalide.' }, { status: 400 })
  }
  const key = docUrl.slice(keyStart + bucketPrefix.length)

  if (!key.startsWith('kyc/') || key.includes('..') || key.includes('%2e') || key.includes('%2E') || key.includes('\0')) {
    return NextResponse.json({ error: 'URL de document invalide.' }, { status: 400 })
  }

  const signedUrl = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn: 900 } // 15 min
  )

  // Redirection directe vers l'URL signée
  return NextResponse.redirect(signedUrl)
}
