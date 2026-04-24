// Page support — formulaire email uniquement.
// Le chatbot est accessible via le widget flottant (ChatWidget) sur toutes les pages.
import { auth } from '@/auth'
import SupportClient from './SupportClient'

export default async function SupportPage() {
  const session = await auth()
  return (
    <SupportClient
      isAuthenticated={!!(session?.user)}
      userEmail={session?.user?.email ?? ''}
    />
  )
}
