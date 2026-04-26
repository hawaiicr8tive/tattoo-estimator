import Dashboard from '@/components/trends/Dashboard'
import { TATTOO_DATASET, FASHION_DATASET, MUSIC_DATASET, INTERIOR_DATASET } from '@/lib/trends/data'

export const metadata = {
  title: 'Style Cycle Dashboard | Tattoolicious',
  description: 'Predict upcoming styles from historical strands, cycle math, and fusion anomalies.',
}

export default function TrendsPage() {
  const datasets = [TATTOO_DATASET, FASHION_DATASET, MUSIC_DATASET, INTERIOR_DATASET]
  const currentYear = new Date().getFullYear()
  return (
    <div className="min-h-screen bg-[var(--brand-bg)] px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <Dashboard datasets={datasets} defaultIndustry="tattoo" currentYear={currentYear} />
      </div>
    </div>
  )
}
