import ResearchTab from '@/components/admin/ResearchTab'
import { requirePage } from '@/lib/dal'

export const dynamic = 'force-dynamic'

export default async function ResearchPage() {
  await requirePage('page:research')
  return (
    <div className="px-3 sm:px-4 py-6 sm:py-8 max-w-7xl mx-auto">
      <ResearchTab />
    </div>
  )
}
