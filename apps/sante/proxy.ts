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
  { prefix: '/doctor',  roles: ['doctor', 'admin'] },
  { prefix: '/patient', roles: ['patient', 'admin'] },
  { prefix: '/admin',   roles: ['admin'] },
]

const RL_MAP = new Map<string, RateEntry>()

const RL_RULES: RateLimitRule[] = [
  { pattern: /^\/api\/auth\//,       limit: 10, windowMs: 15 * 60 * 1000 },
  { pattern: /^\/api\/appointment$/, limit: 20, windowMs:  1 * 60 * 1000 },
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

  if (pathname === '/' ||
      pathname.startsWith('/login') ||
      pathname.startsWith('/register') ||
      pathname.startsWith('/api/auth') ||
      pathname.startsWith('/api/health')) {
    return NextResponse.next()
  }

  const session = req.auth
  const userRole = session?.user?.role

  if (!session || !userRole) {
    const loginUrl = new URL('/login', req.url)
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
    case 'doctor':  return '/doctor/dashboard'
    case 'patient': return '/patient/dashboard'
    case 'admin':   return '/admin'
    default:        return '/login'
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
