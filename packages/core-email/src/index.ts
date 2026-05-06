// SERVER ONLY — ne jamais importer côté client
import { Resend } from 'resend'
import type { ReactElement } from 'react'

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY is not configured')
  return new Resend(key)
}

export interface SendEmailOptions {
  from: string
  to: string | string[]
  subject: string
  html?: string
  react?: ReactElement
}

export async function sendEmail(opts: SendEmailOptions): Promise<void> {
  await getResend().emails.send(opts as Parameters<Resend['emails']['send']>[0])
}
