import TrendsTab from '@/components/admin/TrendsTab'
import MotifLibraryImporter from '@/components/admin/MotifLibraryImporter'
import { requirePage } from '@/lib/dal'

export const dynamic = 'force-dynamic'

export default async function DataPage() {
  await requirePage('page:trends')
  return (
    <div className="px-3 sm:px-4 py-6 sm:py-8 max-w-7xl mx-auto space-y-6">
      <MotifLibraryImporter />
      <TrendsTab />
    </div>
  )
}
