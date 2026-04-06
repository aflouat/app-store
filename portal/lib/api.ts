const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.perform-learn.fr'

export type App = {
  id: string
  slug: string
  name: string
  description: string | null
  icon_url: string | null
  version: string
  status: 'published' | 'coming_soon' | 'draft'
  url: string | null
  category: string
  tags: string[]
}

export type WaitlistStats = {
  total: number
  by_type: { client: number; freelance: number }
}

const MOCK_APPS: App[] = [
  {
    id: '1',
    slug: 'meteo-projet',
    name: 'Météo Projet',
    description: "Dashboard de suivi santé projet ERP. Visualisez l'état de vos chantiers D365/AS400 en un coup d'œil.",
    icon_url: null,
    version: '0.1.0',
    status: 'published',
    url: null,
    category: 'Gestion de projet',
    tags: ['D365', 'AS400', 'Dashboard'],
  },
  {
    id: '2',
    slug: 'stock-manager',
    name: 'Gestion de Stock',
    description: 'Suivi simplifié des entrées/sorties de stock. Connecté à votre ERP.',
    icon_url: null,
    version: '0.1.0',
    status: 'draft',
    url: null,
    category: 'Supply Chain',
    tags: ['Stock', 'ERP', 'Logistique'],
  },
  {
    id: '3',
    slug: 'linkedin-generator',
    name: 'PMFlow — LinkedIn Generator',
    description: 'Générez des posts LinkedIn percutants spécialisés pour les consultants ERP/D365.',
    icon_url: null,
    version: '0.1.0',
    status: 'published',
    url: null,
    category: 'Marketing',
    tags: ['LinkedIn', 'IA', 'Consulting'],
  },
  {
    id: '4',
    slug: 'booking-consultant',
    name: 'Booking Consultant',
    description: 'Réservez un expert en quelques clics. Calendrier temps réel, NDA automatique, paiement sécurisé.',
    icon_url: null,
    version: '0.1.0',
    status: 'coming_soon',
    url: null,
    category: 'Consulting',
    tags: ['Booking', 'Freelance', 'Matching'],
  },
  {
    id: '5',
    slug: 'formation-hub',
    name: 'Formation Hub',
    description: 'Parcours de formation certifiants pour les professionnels ERP. Apprenez, pratiquez, certifiez.',
    icon_url: null,
    version: '0.1.0',
    status: 'coming_soon',
    url: null,
    category: 'Formation',
    tags: ['Formation', 'Certification', 'E-learning'],
  },
]

export async function getApps(): Promise<App[]> {
  try {
    const res = await fetch(`${API}/apps`, { next: { revalidate: 60 } })
    if (!res.ok) return MOCK_APPS
    return res.json()
  } catch {
    return MOCK_APPS
  }
}

export async function getApp(slug: string): Promise<App | null> {
  try {
    const res = await fetch(`${API}/apps/${slug}`, { next: { revalidate: 60 } })
    if (!res.ok) return MOCK_APPS.find(a => a.slug === slug) ?? null
    return res.json()
  } catch {
    return MOCK_APPS.find(a => a.slug === slug) ?? null
  }
}

export async function getWaitlistStats(): Promise<WaitlistStats | null> {
  try {
    const res = await fetch(`${API}/waitlist/stats`, { next: { revalidate: 300 } })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}
