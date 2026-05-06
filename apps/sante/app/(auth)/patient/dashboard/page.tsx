import { auth } from '@/auth'
import { redirect } from 'next/navigation'

export default async function PatientDashboard() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Espace patient</h1>
      <p>Bienvenue, {session.user.name ?? session.user.email}</p>
      <p>Vos rendez-vous apparaîtront ici.</p>
    </main>
  )
}
