import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { query } from '@/lib/freelancehub/db'
import SearchClient from '@/components/freelancehub/client/SearchClient'
import type { Skill } from '@/lib/freelancehub/types'
import { getTranslations } from 'next-intl/server'

export default async function ClientSearchPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'client') redirect('/freelancehub/login')

  const [t, skills] = await Promise.all([
    getTranslations('ClientSearch'),
    query<Skill>(`SELECT id, name, category FROM freelancehub.skills ORDER BY category, name`),
  ])

  return (
    <div className="fh-page">
      <header className="fh-page-header">
        <h1 className="fh-page-title">{t('title')}</h1>
        <p className="fh-page-sub">{t('subtitle')}</p>
      </header>
      <SearchClient skills={skills} clientId={session.user.id} />
      <style>{`
        .fh-page { display: flex; flex-direction: column; gap: 2rem; max-width: 860px; }
        .fh-page-header { display: flex; flex-direction: column; gap: .4rem; }
        .fh-page-title { font-family: 'Fraunces', serif; font-size: 1.7rem; font-weight: 700; color: var(--dark); }
        .fh-page-sub { color: var(--text-mid); font-size: .92rem; max-width: 620px; line-height: 1.6; }
      `}</style>
    </div>
  )
}
