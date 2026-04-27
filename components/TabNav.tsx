'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import AccentPicker from './AccentPicker'

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
    <header className="bg-[var(--brand-card)] border-b border-[var(--brand-border)] sticky top-0 z-10 backdrop-blur-sm bg-opacity-95">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[var(--brand-primary)] font-black text-lg">▲</span>
          <span className="font-black text-[var(--brand-text)] truncate">Style Prediction Model</span>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <AccentPicker />
          <button
            type="button"
            onClick={handleSignOut}
            className="text-xs text-[var(--brand-text-mid)] hover:text-[var(--brand-text)] cursor-pointer"
          >
            Sign out
          </button>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4">
        <nav className="flex gap-0" aria-label="Primary">
          {TABS.map(tab => {
            const active = pathname === tab.href
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  active
                    ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]'
                    : 'border-transparent text-[var(--brand-text-mid)] hover:text-[var(--brand-text)]'
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
