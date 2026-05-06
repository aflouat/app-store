import { describe, it, expect } from 'vitest'

// Logique RBAC (RG-05) — copie locale de la logique middleware
type Role = 'client' | 'consultant' | 'admin'

const ROLE_DASHBOARDS: Record<Role, string> = {
  client: '/freelancehub/client',
  consultant: '/freelancehub/consultant',
  admin: '/freelancehub/admin',
}

const PROTECTED_PREFIXES: Record<string, Role[]> = {
  '/freelancehub/client': ['client', 'admin'],
  '/freelancehub/consultant': ['consultant', 'admin'],
  '/freelancehub/admin': ['admin'],
}

function canAccess(role: Role, path: string): boolean {
  for (const [prefix, allowedRoles] of Object.entries(PROTECTED_PREFIXES)) {
    if (path.startsWith(prefix)) {
      return allowedRoles.includes(role)
    }
  }
  return true // routes publiques
}

function getRedirectTarget(role: Role, attemptedPath: string): string | null {
  if (canAccess(role, attemptedPath)) return null
  return ROLE_DASHBOARDS[role]
}

describe('RBAC — accès par rôle (RG-05)', () => {
  it('client peut accéder à /freelancehub/client', () => {
    expect(canAccess('client', '/freelancehub/client')).toBe(true)
  })

  it('client ne peut pas accéder à /freelancehub/consultant', () => {
    expect(canAccess('client', '/freelancehub/consultant')).toBe(false)
  })

  it('client ne peut pas accéder à /freelancehub/admin', () => {
    expect(canAccess('client', '/freelancehub/admin')).toBe(false)
  })

  it('consultant peut accéder à /freelancehub/consultant', () => {
    expect(canAccess('consultant', '/freelancehub/consultant')).toBe(true)
  })

  it('consultant ne peut pas accéder à /freelancehub/client', () => {
    expect(canAccess('consultant', '/freelancehub/client')).toBe(false)
  })

  it('consultant ne peut pas accéder à /freelancehub/admin', () => {
    expect(canAccess('consultant', '/freelancehub/admin')).toBe(false)
  })

  it('admin peut accéder à tous les dashboards', () => {
    expect(canAccess('admin', '/freelancehub/client')).toBe(true)
    expect(canAccess('admin', '/freelancehub/consultant')).toBe(true)
    expect(canAccess('admin', '/freelancehub/admin')).toBe(true)
  })
})

describe('RBAC — redirection sur mauvais rôle', () => {
  it('consultant accédant à /client → redirigé vers /consultant', () => {
    const redirect = getRedirectTarget('consultant', '/freelancehub/client')
    expect(redirect).toBe('/freelancehub/consultant')
  })

  it('client accédant à /admin → redirigé vers /client', () => {
    const redirect = getRedirectTarget('client', '/freelancehub/admin')
    expect(redirect).toBe('/freelancehub/client')
  })

  it('admin accédant à n\'importe quel dashboard → pas de redirection', () => {
    expect(getRedirectTarget('admin', '/freelancehub/client')).toBeNull()
    expect(getRedirectTarget('admin', '/freelancehub/consultant')).toBeNull()
    expect(getRedirectTarget('admin', '/freelancehub/admin')).toBeNull()
  })

  it('route publique → accessible sans redirection', () => {
    expect(canAccess('client', '/freelancehub/login')).toBe(true)
    expect(canAccess('consultant', '/freelancehub/register')).toBe(true)
  })
})

describe('RBAC — dashboards par rôle', () => {
  it.each([
    ['client', '/freelancehub/client'],
    ['consultant', '/freelancehub/consultant'],
    ['admin', '/freelancehub/admin'],
  ] as [Role, string][])('rôle %s → dashboard %s', (role, expected) => {
    expect(ROLE_DASHBOARDS[role]).toBe(expected)
  })
})
