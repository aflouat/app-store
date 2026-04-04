const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.perform-learn.fr'

export type App = {
  id: string
  slug: string
  name: string
  description: string | null
  icon_url: string | null
  version: string
  status: string
  url: string | null
}

export async function getApps(): Promise<App[]> {
  const res = await fetch(`${API}/apps`, { next: { revalidate: 60 } })
  if (!res.ok) return []
  return res.json()
}
