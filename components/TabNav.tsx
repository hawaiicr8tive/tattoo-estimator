'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const TABS = [
  { href: '/',         label: 'Dashboard' },
  { href: '/data',     label: 'Trends' },
  { href: '/research', label: 'AI Research' },
] as const

export default function TabNav() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    await fetch('/api/admin/auth', { method: 'DELETE' }).catch(() => {})
    router.refresh()
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[var(--brand-primary)] font-black text-lg">▲</span>
          <span className="font-black text-[#0A0A0A]">Style Prediction Model</span>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="text-xs text-[#555555] hover:text-[#0A0A0A] cursor-pointer"
        >
          Sign out
        </button>
      </div>
      <div className="mx-auto max-w-7xl px-4">
        <nav className="flex gap-0">
          {TABS.map(tab => {
            const active = pathname === tab.href
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  active
                    ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]'
                    : 'border-transparent text-[#555555] hover:text-[#0A0A0A]'
                }`}
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
