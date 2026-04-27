import Dashboard from '@/components/trends/Dashboard'
import { loadAllDatasets } from '@/lib/trends/store'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const datasets = await loadAllDatasets()
  const currentYear = new Date().getFullYear()
  return (
    <div className="px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <Dashboard datasets={datasets} defaultIndustry="tattoo" currentYear={currentYear} />
      </div>
    </div>
  )
}
