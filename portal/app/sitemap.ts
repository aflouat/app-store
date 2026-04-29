import { MetadataRoute } from 'next'

const BASE = 'https://portal.perform-learn.fr'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE,                              changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${BASE}/freelancehub/register`,   changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE}/freelancehub/login`,      changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/freelancehub/support`,    changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/freelancehub/cgu`,        changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${BASE}/freelancehub/privacy`,    changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${BASE}/legal`,                   changeFrequency: 'yearly',  priority: 0.2 },
  ]
}
