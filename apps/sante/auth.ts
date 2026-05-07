// Node.js only — pas d'import dans middleware
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { authConfig } from '@/auth.config'
import { getUserWithPasswordHash } from '@/lib/sante/auth-queries'
import type { SanteRole } from '@/lib/sante/types'

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const { email, password } = credentials as { email: string; password: string }
        if (!email || !password) return null

        const user = await getUserWithPasswordHash(email)
        if (!user || !user.is_active) return null

        const valid = await bcrypt.compare(password, user.password_hash)
        if (!valid) return null

        return { id: user.id, email: user.email, name: user.name, role: user.role }
      },
    }),
  ],
})

declare module 'next-auth' {
  interface User {
    role: SanteRole
  }
  interface Session {
    user: {
      id:    string
      email: string
      name:  string
      role:  SanteRole
    }
  }
}
