import Link from 'next/link'

export default function LandingPage() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>SantéApp</h1>
      <p>Plateforme de mise en relation patients / médecins.</p>
      <nav style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
        <Link href="/login">Se connecter</Link>
        <Link href="/register">Créer un compte</Link>
      </nav>
    </main>
  )
}
