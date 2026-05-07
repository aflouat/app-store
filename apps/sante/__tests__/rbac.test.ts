import { describe, it, expect } from 'vitest'
import { matchRouteRule } from '@app-store/core-auth'
import type { RouteRule } from '@app-store/core-auth'
import type { SanteRole } from '../lib/sante/types'

// Miroir des ROUTE_RULES du middleware sante
const SANTE_ROUTE_RULES: RouteRule[] = [
  { prefix: '/doctor',  roles: ['doctor', 'admin'] },
  { prefix: '/patient', roles: ['patient', 'admin'] },
  { prefix: '/admin',   roles: ['admin'] },
]

const ROLE_HOME: Record<SanteRole, string> = {
  patient: '/patient/dashboard',
  doctor:  '/doctor/dashboard',
  admin:   '/admin',
}

function canAccess(role: SanteRole, pathname: string): boolean {
  const rule = matchRouteRule(pathname, SANTE_ROUTE_RULES)
  if (!rule) return true
  return rule.roles.includes(role)
}

function getRedirect(role: SanteRole, pathname: string): string | null {
  if (canAccess(role, pathname)) return null
  return ROLE_HOME[role]
}

describe('RBAC sante — accès par rôle', () => {
  it('patient accède à /patient/dashboard', () => {
    expect(canAccess('patient', '/patient/dashboard')).toBe(true)
  })

  it('patient ne peut pas accéder à /doctor/dashboard', () => {
    expect(canAccess('patient', '/doctor/dashboard')).toBe(false)
  })

  it('patient ne peut pas accéder à /admin', () => {
    expect(canAccess('patient', '/admin')).toBe(false)
  })

  it('doctor accède à /doctor/dashboard', () => {
    expect(canAccess('doctor', '/doctor/dashboard')).toBe(true)
  })

  it('doctor ne peut pas accéder à /patient/dashboard', () => {
    expect(canAccess('doctor', '/patient/dashboard')).toBe(false)
  })

  it('doctor ne peut pas accéder à /admin', () => {
    expect(canAccess('doctor', '/admin')).toBe(false)
  })

  it('admin accède à tous les espaces', () => {
    expect(canAccess('admin', '/doctor/dashboard')).toBe(true)
    expect(canAccess('admin', '/patient/dashboard')).toBe(true)
    expect(canAccess('admin', '/admin')).toBe(true)
  })
})

describe('RBAC sante — redirections', () => {
  it('patient vers /doctor → redirigé vers /patient/dashboard', () => {
    expect(getRedirect('patient', '/doctor/dashboard')).toBe('/patient/dashboard')
  })

  it('doctor vers /patient → redirigé vers /doctor/dashboard', () => {
    expect(getRedirect('doctor', '/patient/dashboard')).toBe('/doctor/dashboard')
  })

  it('admin → pas de redirection', () => {
    expect(getRedirect('admin', '/doctor/dashboard')).toBeNull()
    expect(getRedirect('admin', '/patient/dashboard')).toBeNull()
  })

  it('route publique /login → accessible sans redirection', () => {
    expect(canAccess('patient', '/login')).toBe(true)
    expect(canAccess('doctor', '/register')).toBe(true)
  })
})

describe('RBAC sante — dashboards par rôle', () => {
  it.each([
    ['patient', '/patient/dashboard'],
    ['doctor',  '/doctor/dashboard'],
    ['admin',   '/admin'],
  ] as [SanteRole, string][])('rôle %s → home %s', (role, expected) => {
    expect(ROLE_HOME[role]).toBe(expected)
  })
})
