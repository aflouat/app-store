'use client'
import { signOut } from 'next-auth/react'
import { AppNav } from '@app-store/core-ui'
import type { SanteRole } from '@/lib/sante/types'

const ROLE_BADGES: Record<SanteRole, { label: string; color: string }> = {
  patient: { label: 'Patient',  color: '#B9958D' },
  doctor:  { label: 'Médecin',  color: '#96AEAA' },
  admin:   { label: 'Admin',    color: '#A3AB9A' },
}

const ROLE_HOME: Record<SanteRole, string> = {
  patient: '/patient/dashboard',
  doctor:  '/doctor/dashboard',
  admin:   '/admin',
}

interface SaNavProps {
  user:         { name?: string | null; email: string; role: SanteRole }
  unreadCount?: number
}

export default function SaNav({ user, unreadCount }: SaNavProps) {
  return (
    <AppNav
      appName="SantéApp"
      logoMark="SA"
      homeUrl={ROLE_HOME[user.role]}
      user={user}
      roleBadge={ROLE_BADGES[user.role]}
      onSignOut={() => signOut({ callbackUrl: '/login' })}
      unreadCount={unreadCount}
    />
  )
}
