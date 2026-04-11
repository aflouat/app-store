import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { getUserWithPasswordHash } from '@/lib/freelancehub/auth-queries'
import { authConfig } from './auth.config'
import type { UserRole } from '@/lib/freelancehub/types'

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
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

// JWT augmentation is handled via next-auth's unified types in v5 beta
// The jwt callback above extends the token directly
