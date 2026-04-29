import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/freelancehub/client/',
        '/freelancehub/consultant/',
        '/freelancehub/admin/',
      ],
    }],
    sitemap: 'https://portal.perform-learn.fr/sitemap.xml',
  }
}
