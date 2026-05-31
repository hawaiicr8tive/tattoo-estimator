'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import AccentPicker from './AccentPicker'

const TABS = [
  { href: '/',         label: 'Dashboard' },
  { href: '/data',     label: 'Trends' },
  { href: '/research', label: 'AI Research' },
  { href: '/library',  label: 'Library' },
  { href: '/phrases',  label: 'Phrases' },
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
      <div className="mx-auto max-w-7xl px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[var(--brand-primary)] font-black text-lg shrink-0">▲</span>
          <span className="font-black text-[var(--brand-text)] truncate text-sm sm:text-base">
            <span className="hidden sm:inline">Style Prediction Model</span>
            <span className="sm:hidden">SPM</span>
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <AccentPicker />
          <button
            type="button"
            onClick={handleSignOut}
            className="text-xs text-[var(--brand-text-mid)] hover:text-[var(--brand-text)] cursor-pointer hidden sm:inline"
          >
            Sign out
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            aria-label="Sign out"
            className="text-base text-[var(--brand-text-mid)] hover:text-[var(--brand-text)] cursor-pointer sm:hidden"
            title="Sign out"
          >
            ⏻
          </button>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-3 sm:px-4">
        <nav className="flex gap-0 overflow-x-auto" aria-label="Primary">
          {TABS.map(tab => {
            const active = pathname === tab.href
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`relative px-3 sm:px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors ${
                  active
                    ? 'text-[var(--brand-primary)]'
                    : 'text-[var(--brand-text-mid)] hover:text-[var(--brand-text)]'
                }`}
              >
                {tab.label}
                {active && (
                  <span
                    className="absolute left-0 right-0 bottom-0 h-[3px] rounded-t"
                    style={{
                      background: 'var(--brand-gradient)',
                      boxShadow: '0 0 14px var(--brand-glow)',
                    }}
                  />
                )}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
