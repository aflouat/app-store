import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import FHNav      from '@/components/freelancehub/FHNav'
import FHSidebar  from '@/components/freelancehub/FHSidebar'
import type { UserRole } from '@/lib/freelancehub/types'
import { getUnreadCount } from '@/lib/freelancehub/notifications'

export const metadata = {
  title: 'FreelanceHub — perform-learn.fr',
  description: 'Marketplace B2B consulting & expertise',
}

export default async function FreelanceHubLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  // Login page is rendered without this layout (its own route segment)
  // but middleware will already redirect unauthenticated users
  if (!session?.user) {
    redirect('/freelancehub/login')
  }

  const user = {
    name:  session.user.name  ?? session.user.email,
    email: session.user.email,
    role:  session.user.role  as UserRole,
  }

  const unreadCount = await getUnreadCount(session.user.id).catch(() => 0)

  return (
    <div className="fh-shell">
      <FHNav user={user} unreadCount={unreadCount} />
      <div className="fh-body">
        <FHSidebar role={user.role} />
        <main className="fh-main">{children}</main>
      </div>

      <style>{`
        .fh-shell {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
        }
        .fh-body {
          display: flex;
          flex: 1;
        }
        .fh-main {
          flex: 1;
          padding: 2rem 2.5rem;
          overflow-y: auto;
          background: var(--bg);
        }
        @media (max-width: 768px) {
          .fh-sidebar { display: none; }
          .fh-main { padding: 1.2rem 1rem; }
        }
      `}</style>
    </div>
  )
}
