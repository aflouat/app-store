export const dynamic = 'force-dynamic'

import { getArtifactContext } from '@/lib/govern/queries'
import { ArtifactCard } from '@/components/govern/ArtifactCard'

export default async function RoadmapPage() {
  const artifacts = await getArtifactContext('perform-learn')
  const cycles = artifacts.filter(a => a.type_slug === 'roadmap_cycle')

  return (
    <div>
      <h1 className="text-xl font-medium mb-6">Roadmap Perform-Learn</h1>
      <div className="flex flex-col gap-4">
        {cycles.map(cycle => (
          <ArtifactCard key={cycle.id} artifact={cycle} showChildren />
        ))}
      </div>
    </div>
  )
}