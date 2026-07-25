import Dashboard from '@/components/trends/Dashboard'
import { loadAllDatasets } from '@/lib/trends/store'
import { requirePage } from '@/lib/dal'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const user = await requirePage('page:dashboard')
  const datasets = await loadAllDatasets()
  const currentYear = new Date().getFullYear()
  return (
    <div className="px-3 sm:px-4 py-6 sm:py-8">
      <div className="max-w-6xl mx-auto">
        <Dashboard
          datasets={datasets}
          defaultIndustry="tattoo"
          currentYear={currentYear}
          canGenerate={user?.permissions.has('images:generate') ?? false}
          canBulk={user?.permissions.has('images:bulk') ?? false}
        />
      </div>
    </div>
  )
}
