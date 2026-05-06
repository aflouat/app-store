import { auth } from '@/auth'
import ChatWidget from '@/components/freelancehub/ChatWidget'

export default async function FreelanceHubRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  const isAuthenticated = !!session?.user
  const userEmail = session?.user?.email ?? ''

  return (
    <>
      {children}
      <ChatWidget userEmail={userEmail} isAuthenticated={isAuthenticated} />
    </>
  )
}
