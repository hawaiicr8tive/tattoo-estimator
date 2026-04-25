'use client'
import { useState, useEffect } from 'react'
import PricingTab from '@/components/admin/PricingTab'
import StylesTab from '@/components/admin/StylesTab'
import SizesTab from '@/components/admin/SizesTab'
import PlacementsTab from '@/components/admin/PlacementsTab'
import ArtistsTab from '@/components/admin/ArtistsTab'
import LeadsTab from '@/components/admin/LeadsTab'
import BrandingTab from '@/components/admin/BrandingTab'
import type { AdminConfig } from '@/lib/admin-types'

const TABS = [
  { id: 'leads',      label: 'Leads' },
  { id: 'pricing',    label: 'Pricing' },
  { id: 'styles',     label: 'Styles' },
  { id: 'sizes',      label: 'Sizes' },
  { id: 'placements', label: 'Placements' },
  { id: 'artists',    label: 'Artists' },
  { id: 'branding',   label: 'Branding' },
] as const

type TabId = typeof TABS[number]['id']

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState('')
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwLoading, setPwLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>('leads')
  const [config, setConfig] = useState<AdminConfig | null>(null)
  const [configLoading, setConfigLoading] = useState(false)
  const [configError, setConfigError] = useState<string | null>(null)

  useEffect(() => {
    if (!authed) return
    setConfigLoading(true)
    fetch('/api/admin/config')
      .then(r => r.json())
      .then(setConfig)
      .catch(e => setConfigError(e.message))
      .finally(() => setConfigLoading(false))
  }, [authed])

  async function handleLogin() {
    setPwLoading(true)
    setPwError(null)
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      })
      if (res.ok) {
        setAuthed(true)
      } else {
        const data = await res.json()
        setPwError(data.error ?? 'Incorrect password')
      }
    } catch {
      setPwError('Connection error — try again')
    } finally {
      setPwLoading(false)
    }
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-2xl bg-white shadow-sm border border-gray-100 p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#7B0000]/10 mb-3">
              <span className="text-[#7B0000] text-xl">🔒</span>
            </div>
            <h1 className="text-xl font-black text-[#0A0A0A]">Tattoolicious Admin</h1>
            <p className="text-sm text-[#555555] mt-1">Enter your password to continue</p>
          </div>
          <input
            type="password"
            value={pw}
            onChange={e => { setPw(e.target.value); setPwError(null) }}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="Password"
            autoFocus
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-[#0A0A0A] focus:outline-none focus:ring-2 focus:ring-[#7B0000] focus:border-transparent mb-3"
          />
          {pwError && <p className="text-xs text-red-600 mb-3">{pwError}</p>}
          <button
            type="button"
            onClick={handleLogin}
            disabled={pwLoading}
            className="w-full rounded-lg bg-[#7B0000] py-3 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60 cursor-pointer"
          >
            {pwLoading ? 'Checking…' : 'Sign In →'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F5F0]">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[#7B0000] font-black text-lg">■</span>
            <span className="font-black text-[#0A0A0A]">Tattoolicious Admin</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/" target="_blank" className="text-xs text-[#555555] hover:text-[#0A0A0A] underline">
              View site ↗
            </a>
            <button
              type="button"
              onClick={() => setAuthed(false)}
              className="text-xs text-[#555555] hover:text-[#0A0A0A] cursor-pointer"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Tab nav */}
        <div className="mx-auto max-w-7xl px-4 pb-0">
          <nav className="flex gap-0">
            {TABS.map(tab => (
              <button
                key={tab.id}
                type="button"
                onPointerDown={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer
                  ${activeTab === tab.id
                    ? 'border-[#7B0000] text-[#7B0000]'
                    : 'border-transparent text-[#555555] hover:text-[#0A0A0A]'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Leads tab doesn't need config */}
        {activeTab === 'leads' && <LeadsTab />}

        {/* Config tabs */}
        {activeTab !== 'leads' && configLoading && (
          <p className="text-[#555555] py-12 text-center">Loading configuration…</p>
        )}
        {activeTab !== 'leads' && configError && (
          <p className="text-red-600 py-4">{configError}</p>
        )}
        {activeTab !== 'leads' && !configLoading && !configError && config && (
          <>
            {activeTab === 'pricing'    && <PricingTab    initialData={config.pricing}    />}
            {activeTab === 'styles'     && <StylesTab     initialData={config.styles}     />}
            {activeTab === 'sizes'      && <SizesTab      initialData={config.sizes}      initialXl={config.xlConfig} />}
            {activeTab === 'placements' && <PlacementsTab initialData={config.placements} />}
            {activeTab === 'artists'    && <ArtistsTab    initialData={config.artists}    />}
            {activeTab === 'branding'   && <BrandingTab   initialData={config.branding}   />}
          </>
        )}
      </main>
    </div>
  )
}
