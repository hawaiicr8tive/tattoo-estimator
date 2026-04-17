'use client'
import { useState } from 'react'
import SaveBar from './SaveBar'
import type { AdminPricing } from '@/lib/admin-types'

interface Props { initialData: AdminPricing }

const TIER_LABELS: Record<string, string> = { '1': 'Tier 1 — Artist', '2': 'Tier 2 — Senior', '3': 'Tier 3 — Featured' }

export default function PricingTab({ initialData }: Props) {
  const [data, setData] = useState<AdminPricing>(initialData)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function setTierRate(tier: string, field: 'min' | 'max', value: number) {
    setData(d => ({ ...d, tierRates: { ...d.tierRates, [tier]: { ...d.tierRates[tier], [field]: value } } }))
  }

  async function handleSave() {
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/admin/config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'pricing', data }) })
      if (!res.ok) throw new Error('Save failed')
      setSaved(true); setTimeout(() => setSaved(false), 2500)
    } catch (e) { setError(e instanceof Error ? e.message : 'Error') }
    finally { setSaving(false) }
  }

  return (
    <div>
      <SaveBar title="Pricing & Rates" saving={saving} saved={saved} error={error} onSave={handleSave} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="rounded-xl bg-white border border-gray-200 p-4">
          <label className="block text-xs font-bold text-[#555555] uppercase tracking-wide mb-2">Shop Minimum ($)</label>
          <input type="number" min={0} step={10} value={data.shopMinimum}
            onChange={e => setData(d => ({ ...d, shopMinimum: Number(e.target.value) }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-lg font-bold text-[#0A0A0A] focus:outline-none focus:ring-2 focus:ring-[#7B0000] focus:border-transparent" />
          <p className="mt-1 text-xs text-[#555555]">Minimum charge for any tattoo</p>
        </div>
        <div className="rounded-xl bg-white border border-gray-200 p-4">
          <label className="block text-xs font-bold text-[#555555] uppercase tracking-wide mb-2">Color Multiplier</label>
          <div className="flex items-center gap-2">
            <input type="number" min={1} max={2} step={0.01} value={data.colorMultiplier}
              onChange={e => setData(d => ({ ...d, colorMultiplier: Number(e.target.value) }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-lg font-bold text-[#0A0A0A] focus:outline-none focus:ring-2 focus:ring-[#7B0000] focus:border-transparent" />
            <span className="text-sm text-[#555555] whitespace-nowrap">
              = +{Math.round((data.colorMultiplier - 1) * 100)}%
            </span>
          </div>
          <p className="mt-1 text-xs text-[#555555]">Applied to session hours for color work</p>
        </div>
      </div>

      <h3 className="text-sm font-bold text-[#0A0A0A] uppercase tracking-wide mb-3">Hourly Rates by Artist Tier</h3>
      <div className="rounded-xl bg-white border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F9F9F7] border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-bold text-[#555555] uppercase tracking-wide">Tier</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-[#555555] uppercase tracking-wide">Min $/hr</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-[#555555] uppercase tracking-wide">Max $/hr</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-[#555555] uppercase tracking-wide">Range</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(data.tierRates).sort().map(([tier, rates]) => (
              <tr key={tier} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-3 font-medium text-[#0A0A0A]">{TIER_LABELS[tier] ?? `Tier ${tier}`}</td>
                <td className="px-4 py-3">
                  <input type="number" min={0} step={10} value={rates.min}
                    onChange={e => setTierRate(tier, 'min', Number(e.target.value))}
                    className="w-24 rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#7B0000]" />
                </td>
                <td className="px-4 py-3">
                  <input type="number" min={0} step={10} value={rates.max}
                    onChange={e => setTierRate(tier, 'max', Number(e.target.value))}
                    className="w-24 rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#7B0000]" />
                </td>
                <td className="px-4 py-3 text-[#555555]">${rates.min}–${rates.max}/hr</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
