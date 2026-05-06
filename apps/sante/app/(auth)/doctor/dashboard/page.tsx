import { auth } from '@/auth'
import { redirect } from 'next/navigation'

export default async function DoctorDashboard() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Espace médecin</h1>
      <p>Bienvenue Dr {session.user.name ?? session.user.email}</p>
      <p>Vos consultations du jour apparaîtront ici.</p>
    </main>
  )
}
