import { cookies } from 'next/headers'
import Link from 'next/link'
import Dashboard from '@/components/trends/Dashboard'
import { loadAllDatasets } from '@/lib/trends/store'
import { ADMIN_COOKIE, verifyAdminToken } from '@/lib/admin-auth'

export const metadata = {
  title: 'Style Cycle Dashboard | Tattoolicious',
  description: 'Predict upcoming styles from historical strands, cycle math, and fusion anomalies.',
}

// Always render fresh — datasets are admin-editable and the page is gated.
export const dynamic = 'force-dynamic'

export default async function TrendsPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_COOKIE)?.value
  if (!verifyAdminToken(token)) {
    return <SignInPrompt />
  }

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

function SignInPrompt() {
  return (
    <div className="min-h-screen bg-[var(--brand-bg)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-sm border border-gray-100 p-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#7B0000]/10 mb-3">
          <span className="text-[#7B0000] text-xl">🔒</span>
        </div>
        <h1 className="text-xl font-black text-[#0A0A0A]">Trend Dashboard</h1>
        <p className="text-sm text-[#555555] mt-1 mb-5">
          This dashboard is admin-only. Sign in to view forecasts and run research.
        </p>
        <Link
          href="/admin"
          className="inline-block rounded-lg bg-[#7B0000] px-5 py-2.5 text-sm font-bold text-white hover:opacity-90"
        >
          Sign in →
        </Link>
      </div>
    </div>
  )
}
