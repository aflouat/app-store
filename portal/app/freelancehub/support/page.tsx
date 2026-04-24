// Server Component — détecte l'état de session via auth() et passe isAuthenticated au client
import { auth } from '@/auth'
import SupportClient from './SupportClient'

export default async function SupportPage() {
  const session = await auth()
  const isAuthenticated = !!(session?.user)
  const userEmail = session?.user?.email ?? ''

  return <SupportClient isAuthenticated={isAuthenticated} userEmail={userEmail} />
}
