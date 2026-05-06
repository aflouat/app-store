// auth.config.ts — Edge-safe config (no Node.js-only imports)
// Used by middleware (Edge Runtime) and extended by auth.ts (Node.js)
import type { NextAuthConfig } from 'next-auth'
import type { UserRole } from '@/lib/freelancehub/types'

export const authConfig: NextAuthConfig = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt' },

  pages: {
    signIn: '/freelancehub/login',
    error:  '/freelancehub/login',
  },

  // No providers here — credentials provider added in auth.ts (Node.js)
  providers: [],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id   = user.id
        token.role = (user as { role: UserRole }).role
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id   = token.id   as string
        session.user.role = token.role as UserRole
      }
      return session
    },
  },
}
