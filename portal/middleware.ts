import NextAuth from 'next-auth'
import { authConfig } from '@/auth.config'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const { auth } = NextAuth(authConfig)

// Route prefix → required role(s)
const ROUTE_RULES: Array<{ prefix: string; roles: string[] }> = [
  { prefix: '/freelancehub/consultant', roles: ['consultant', 'admin'] },
  { prefix: '/freelancehub/client',     roles: ['client', 'admin'] },
  { prefix: '/freelancehub/admin',      roles: ['admin'] },
]

export default auth((req: NextRequest & { auth: { user?: { role?: string } } | null }) => {
  const { pathname } = req.nextUrl

  // Only protect /freelancehub/** routes (except login & api/auth & public support)
  if (!pathname.startsWith('/freelancehub') ||
       pathname.startsWith('/freelancehub/login') ||
       pathname.startsWith('/freelancehub/register') ||
       pathname.startsWith('/freelancehub/cgu') ||
       pathname.startsWith('/freelancehub/privacy') ||
       pathname.startsWith('/freelancehub/support') ||
       pathname.startsWith('/api/auth') ||
       pathname.startsWith('/api/freelancehub/support/chat/public')) {
    return NextResponse.next()
  }

  const session = req.auth
  const userRole = session?.user?.role

  // Not logged in → redirect to login
  if (!session || !userRole) {
    const loginUrl = new URL('/freelancehub/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Check role-based access
  for (const rule of ROUTE_RULES) {
    if (pathname.startsWith(rule.prefix)) {
      if (!rule.roles.includes(userRole)) {
        // Redirect to user's home space
        const home = getRoleHome(userRole)
        return NextResponse.redirect(new URL(home, req.url))
      }
    }
  }

  return NextResponse.next()
})

function getRoleHome(role: string): string {
  switch (role) {
    case 'consultant': return '/freelancehub/consultant'
    case 'client':     return '/freelancehub/client'
    case 'admin':      return '/freelancehub/admin'
    default:           return '/freelancehub/login'
  }
}

export const config = {
  matcher: [
    '/freelancehub/:path*',
    '/api/freelancehub/:path*',
  ],
}
