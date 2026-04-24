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

// ── Rate limiting (Edge-compatible in-memory) ──────────────────
interface RateEntry { count: number; resetAt: number }
const RL_MAP = new Map<string, RateEntry>()

const RL_RULES: Array<{ pattern: RegExp; limit: number; windowMs: number }> = [
  { pattern: /^\/api\/freelancehub\/auth\//,                           limit: 10,  windowMs: 15 * 60 * 1000 },
  { pattern: /\/payment-intent$/,                                      limit:  5,  windowMs:  5 * 60 * 1000 },
  { pattern: /^\/api\/freelancehub\/support\/chat\/(public|route)$/,   limit: 20,  windowMs:  1 * 60 * 1000 },
]

function checkRateLimit(ip: string, pathname: string): boolean {
  const rule = RL_RULES.find(r => r.pattern.test(pathname))
  if (!rule) return false

  const key = `${ip}:${pathname.replace(/\/[0-9a-f-]{36}/g, '/:id')}`
  const now  = Date.now()
  const entry = RL_MAP.get(key)

  if (!entry || now > entry.resetAt) {
    RL_MAP.set(key, { count: 1, resetAt: now + rule.windowMs })
    return false
  }

  entry.count++
  return entry.count > rule.limit
}

// Clean map every ~500 entries to avoid unbounded growth
function maybeCleanMap() {
  if (RL_MAP.size > 500) {
    const now = Date.now()
    for (const [k, v] of RL_MAP) {
      if (now > v.resetAt) RL_MAP.delete(k)
    }
  }
}

export default auth((req: NextRequest & { auth: { user?: { role?: string } } | null }) => {
  const { pathname } = req.nextUrl
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  maybeCleanMap()

  if (checkRateLimit(ip, pathname)) {
    return NextResponse.json(
      { error: 'Trop de requêtes. Réessayez dans quelques minutes.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    )
  }

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
