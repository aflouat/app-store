import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { auth } from '@/auth'
import { query, queryOne } from '@/lib/freelancehub/db'

const s3 = new S3Client({
  endpoint: process.env.MINIO_ENDPOINT,
  region: 'us-east-1',
  forcePathStyle: true,
  credentials: {
    accessKeyId:     process.env.MINIO_ACCESS_KEY!,
    secretAccessKey: process.env.MINIO_SECRET_KEY!,
  },
})

const BUCKET    = (process.env.MINIO_BUCKET_KYC ?? '').trim() || 'kyc-documents'
const MAX_BYTES = 5 * 1024 * 1024 // 5 Mo
const ALLOWED   = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])

// GET — current KYC status for logged-in consultant
export async function GET() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'consultant') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const row = await queryOne<{
    kyc_status:       string
    kyc_document_name: string | null
    kyc_submitted_at: string | null
    kyc_validated_at: string | null
    kyc_notes:        string | null
  }>(
    `SELECT kyc_status, kyc_document_name, kyc_submitted_at, kyc_validated_at, kyc_notes
     FROM freelancehub.consultants WHERE user_id = $1`,
    [session.user.id]
  )

  return NextResponse.json(row ?? { kyc_status: 'none' })
}

// POST — upload KYC document
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'consultant') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const consultant = await queryOne<{ id: string; kyc_status: string }>(
      `SELECT id, kyc_status FROM freelancehub.consultants WHERE user_id = $1`,
      [session.user.id]
    )
    if (!consultant) {
      return NextResponse.json({ error: 'Profil consultant introuvable.' }, { status: 404 })
    }
    if (consultant.kyc_status === 'validated') {
      return NextResponse.json({ error: 'KYC déjà validé.' }, { status: 409 })
    }

    const formData = await req.formData()
    const file          = formData.get('file') as File | null
    const document_type = formData.get('document_type') as string | null

    if (!file || !document_type) {
      return NextResponse.json({ error: 'Fichier et type de document requis.' }, { status: 400 })
    }
    if (!['KBIS', 'URSSAF', 'SIRENE'].includes(document_type)) {
      return NextResponse.json({ error: 'Type de document invalide.' }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Fichier trop volumineux (max 5 Mo).' }, { status: 413 })
    }

    // Accept file even if type is empty (some browsers omit it) — check extension instead
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
    const mimeByExt: Record<string, string> = {
      pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg',
      png: 'image/png', webp: 'image/webp',
    }
    const resolvedMime = file.type || mimeByExt[ext] || ''
    if (!ALLOWED.has(resolvedMime)) {
      return NextResponse.json({ error: 'Format non supporté (PDF, JPG, PNG uniquement).' }, { status: 415 })
    }

    if (!process.env.MINIO_ENDPOINT) {
      console.error('[kyc] MINIO_ENDPOINT is not set')
      return NextResponse.json({ error: 'Configuration serveur manquante.' }, { status: 500 })
    }

    const key    = `kyc/${consultant.id}/${Date.now()}_${document_type.toLowerCase()}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    console.log(`[kyc] bucket="${BUCKET}" key="${key}" size=${buffer.length} mime=${resolvedMime}`)
    await s3.send(new PutObjectCommand({
      Bucket:      BUCKET,
      Key:         key,
      Body:        buffer,
      ContentType: resolvedMime,
    }))
    console.log(`[kyc] upload ok`)

    const docUrl  = `${process.env.MINIO_ENDPOINT}/${BUCKET}/${key}`
    const docName = `${document_type} - ${file.name}`

    await query(
      `UPDATE freelancehub.consultants
       SET kyc_status = 'submitted', kyc_document_url = $1, kyc_document_name = $2, kyc_submitted_at = NOW()
       WHERE id = $3`,
      [docUrl, docName, consultant.id]
    )

    return NextResponse.json({ success: true, kyc_status: 'submitted' })
  } catch (err) {
    console.error('[kyc] POST error:', err)
    console.error('[kyc] POST error detail:', err instanceof Error ? err.message : String(err))
    return NextResponse.json({ error: 'Erreur lors du traitement du document.' }, { status: 500 })
  }
}
