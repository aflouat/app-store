'use client'
import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const res = await signIn('credentials', {
      email:    form.get('email'),
      password: form.get('password'),
      redirect: false,
    })
    if (res?.error) {
      setError('Email ou mot de passe incorrect.')
    } else {
      router.push('/')
    }
  }

  return (
    <main style={{ maxWidth: 400, margin: '4rem auto', fontFamily: 'sans-serif' }}>
      <h1>Connexion</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input name="email"    type="email"    placeholder="Email"          required />
        <input name="password" type="password" placeholder="Mot de passe"   required />
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit">Se connecter</button>
      </form>
    </main>
  )
}
