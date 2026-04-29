import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://portal.perform-learn.fr'),
  title: {
    default: 'Perform-Learn — Marketplace B2B Freelances & Entreprises',
    template: '%s | Perform-Learn',
  },
  description: "Trouvez le consultant expert B2B qu'il vous faut. Matching algorithmique, KYC vérifié, paiement séquestre sécurisé. 20 places fondateurs à 10% de commission.",
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: 'https://portal.perform-learn.fr',
    siteName: 'Perform-Learn',
    title: 'Perform-Learn — Marketplace B2B Freelances & Entreprises',
    description: 'Matching algorithmique entre consultants experts et entreprises. KYC vérifié, paiement séquestre, anonymat total.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Perform-Learn Marketplace B2B' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Perform-Learn — Marketplace B2B',
    description: 'Matching algorithmique consultants / entreprises. 20 places fondateurs — commission 10%.',
    images: ['/og-image.png'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const umamiUrl = process.env.NEXT_PUBLIC_UMAMI_URL
  const umamiId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID

  return (
    <html lang="fr">
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,700;0,900;1,400&family=DM+Sans:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            'name': 'Perform-Learn',
            'url': 'https://portal.perform-learn.fr',
            'logo': 'https://portal.perform-learn.fr/og-image.png',
            'description': 'Marketplace B2B connectant consultants experts et entreprises via matching algorithmique.',
            'contactPoint': { '@type': 'ContactPoint', 'contactType': 'customer support', 'url': 'https://portal.perform-learn.fr/freelancehub/support' },
          }) }}
        />
        {umamiUrl && umamiId && (
          <Script
            defer
            src={`${umamiUrl}/script.js`}
            data-website-id={umamiId}
          />
        )}
      </body>
    </html>
  )
}
