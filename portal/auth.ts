import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { getUserWithPasswordHash, upsertOAuthUser } from '@/lib/freelancehub/auth-queries'
import { authConfig } from './auth.config'
import type { UserRole } from '@/lib/freelancehub/types'

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Google({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      name: 'credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email    = credentials?.email    as string | undefined
        const password = credentials?.password as string | undefined

        if (!email || !password) return null

        const user = await getUserWithPasswordHash(email)
        if (!user || !user.password_hash) return null

        const valid = await bcrypt.compare(password, user.password_hash)
        if (!valid) return null

        return {
          id:    user.id,
          email: user.email,
          name:  user.name ?? user.email,
          role:  user.role,
        }
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        try {
          const dbUser = await upsertOAuthUser({
            email:           user.email!,
            name:            user.name ?? user.email!,
            oauthProvider:   'google',
            oauthProviderId: account.providerAccountId,
            avatarUrl:       user.image,
          })
          user.id = dbUser.id
          ;(user as { role: UserRole }).role = dbUser.role
        } catch (err) {
          console.error('[signIn] Google upsert error:', err)
          return false
        }
      }
      return true
    },
  },
})

// Augment next-auth types
declare module 'next-auth' {
  interface User {
    role: UserRole
  }
  interface Session {
    user: {
      id:    string
      email: string
      name:  string
      role:  UserRole
    }
  }
}
