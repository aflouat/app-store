import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'perform-learn — App Store',
  description: 'Le hub digital qui connecte freelances et entreprises',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
