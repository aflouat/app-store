// /freelancehub → redirect to role-specific home (middleware handles it)
import { redirect } from 'next/navigation'
import { auth }     from '@/auth'

export default async function FreelanceHubRoot() {
  const session = await auth()
  if (!session?.user) redirect('/freelancehub/login')

  const role = session.user.role
  redirect(`/freelancehub/${role}`)
}
