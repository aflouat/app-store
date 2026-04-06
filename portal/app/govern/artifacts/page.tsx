export const dynamic = 'force-dynamic'

import { getArtifactContext } from '@/lib/govern/queries'
import { ArtifactCard } from '@/components/govern/ArtifactCard'

export default async function ArtifactsPage({
  searchParams,
}: {
  searchParams: { status?: string; type?: string }
}) {
  const artifacts = await getArtifactContext('perform-learn')
  let filtered = artifacts

  if (searchParams.status) {
    filtered = filtered.filter(a => a.status === searchParams.status)
  }
  if (searchParams.type) {
    filtered = filtered.filter(a => a.type_slug === searchParams.type)
  }

  return (
    <div>
      <h1 className="text-xl font-medium mb-6">Tous les artefacts</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map(artifact => (
          <ArtifactCard key={artifact.id} artifact={artifact} />
        ))}
      </div>
    </div>
  )
}