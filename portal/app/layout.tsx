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

const GTM_ID = 'GTM-5CWFL95D'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const umamiUrl = process.env.NEXT_PUBLIC_UMAMI_URL
  const umamiId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID

  return (
    <html lang="fr">
      <head>
        {/* Google Tag Manager */}
        <Script id="gtm-head" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`}
        </Script>
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
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
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
