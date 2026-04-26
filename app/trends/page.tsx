import Dashboard from '@/components/trends/Dashboard'
import { loadAllDatasets } from '@/lib/trends/store'

export const metadata = {
  title: 'Style Cycle Dashboard | Tattoolicious',
  description: 'Predict upcoming styles from historical strands, cycle math, and fusion anomalies.',
}

// Always render fresh — datasets are admin-editable.
export const dynamic = 'force-dynamic'

export default async function TrendsPage() {
  const datasets = await loadAllDatasets()
  const currentYear = new Date().getFullYear()
  return (
    <div className="min-h-screen bg-[var(--brand-bg)] px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <Dashboard datasets={datasets} defaultIndustry="tattoo" currentYear={currentYear} />
      </div>
    </div>
  )
}
