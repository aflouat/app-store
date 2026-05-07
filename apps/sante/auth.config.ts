// Edge-safe — pas d'import bcrypt/pg ici
import type { NextAuthConfig } from 'next-auth'
import type { SanteRole } from '@/lib/sante/types'

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id   = user.id
        token.role = (user as { role: SanteRole }).role
      }
      return token
    },
    session({ session, token }) {
      if (token) {
        session.user.id   = token.id   as string
        session.user.role = token.role as SanteRole
      }
      return session
    },
    authorized({ auth }) {
      return !!auth?.user
    },
  },
  providers: [],
}
