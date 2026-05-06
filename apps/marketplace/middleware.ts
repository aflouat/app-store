import NextAuth from 'next-auth'
import { authConfig } from '@/auth.config'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  checkRateLimit, maybeCleanMap,
  type RouteRule, type RateEntry, type RateLimitRule,
} from '@app-store/core-auth'

const { auth } = NextAuth(authConfig)

const ROUTE_RULES: RouteRule[] = [
  { prefix: '/freelancehub/consultant', roles: ['consultant', 'admin'] },
  { prefix: '/freelancehub/client',     roles: ['client', 'admin'] },
  { prefix: '/freelancehub/admin',      roles: ['admin'] },
]

const RL_MAP = new Map<string, RateEntry>()

const RL_RULES: RateLimitRule[] = [
  { pattern: /^\/api\/freelancehub\/auth\//,               limit: 10, windowMs: 15 * 60 * 1000 },
  { pattern: /\/payment-intent$/,                          limit:  5, windowMs:  5 * 60 * 1000 },
  { pattern: /^\/api\/freelancehub\/support\/chat\/public$/, limit: 20, windowMs:  1 * 60 * 1000 },
]

export default auth((req: NextRequest & { auth: { user?: { role?: string } } | null }) => {
  const { pathname } = req.nextUrl
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  maybeCleanMap(RL_MAP)

  if (checkRateLimit(RL_MAP, RL_RULES, ip, pathname)) {
    return NextResponse.json(
      { error: 'Trop de requêtes. Réessayez dans quelques minutes.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    )
  }

  if (!pathname.startsWith('/freelancehub') ||
       pathname.startsWith('/freelancehub/login') ||
       pathname.startsWith('/freelancehub/register') ||
       pathname.startsWith('/freelancehub/forgot-password') ||
       pathname.startsWith('/freelancehub/reset-password') ||
       pathname.startsWith('/freelancehub/cgu') ||
       pathname.startsWith('/freelancehub/privacy') ||
       pathname.startsWith('/freelancehub/support') ||
       pathname.startsWith('/api/auth') ||
       pathname.startsWith('/api/freelancehub/auth/forgot-password') ||
       pathname.startsWith('/api/freelancehub/auth/reset-password') ||
       pathname.startsWith('/api/freelancehub/support/chat/public')) {
    return NextResponse.next()
  }

  const session = req.auth
  const userRole = session?.user?.role

  if (!session || !userRole) {
    const loginUrl = new URL('/freelancehub/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  for (const rule of ROUTE_RULES) {
    if (pathname.startsWith(rule.prefix)) {
      if (!rule.roles.includes(userRole)) {
        return NextResponse.redirect(new URL(getRoleHome(userRole), req.url))
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
