'use client'
import { useState } from 'react'
import SaveBar from './SaveBar'
import type { AdminPlacement } from '@/lib/admin-types'

interface Props { initialData: AdminPlacement[] }

const GROUPS = ['easy', 'moderate', 'difficult', 'premium'] as const
const GROUP_COLORS: Record<string, string> = {
  easy:     'bg-green-50 text-green-800 border-green-200',
  moderate: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  difficult:'bg-orange-50 text-orange-800 border-orange-200',
  premium:  'bg-red-50 text-red-800 border-red-200',
}

export default function PlacementsTab({ initialData }: Props) {
  const [placements, setPlacements] = useState<AdminPlacement[]>(initialData)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function update(index: number, field: keyof AdminPlacement, value: string | number) {
    setPlacements(p => p.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  function addPlacement(group: string) {
    const id = `custom-${Date.now()}`
    setPlacements(p => [...p, { id, label: 'New Placement', group, multiplier: 1.0 }])
  }

  function removePlacement(index: number) {
    setPlacements(p => p.filter((_, i) => i !== index))
  }

  async function handleSave() {
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/admin/config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'placements', data: placements }) })
      if (!res.ok) throw new Error('Save failed')
      setSaved(true); setTimeout(() => setSaved(false), 2500)
    } catch (e) { setError(e instanceof Error ? e.message : 'Error') }
    finally { setSaving(false) }
  }

  return (
    <div>
      <SaveBar title="Placement Options" saving={saving} saved={saved} error={error} onSave={handleSave} />
      <p className="text-sm text-[#555555] mb-5">Multipliers are applied to session hours. 1.00 = base rate.</p>

      <div className="space-y-6">
        {GROUPS.map(group => {
          const items = placements.map((p, i) => ({ ...p, _i: i })).filter(p => p.group === group)
          return (
            <div key={group}>
              <div className="flex items-center gap-3 mb-3">
                <span className={`inline-block rounded px-2 py-0.5 text-xs font-bold border uppercase ${GROUP_COLORS[group]}`}>
                  {group}
                </span>
                <button type="button" onPointerDown={() => addPlacement(group)}
                  className="text-xs text-[#7B0000] hover:underline cursor-pointer">
                  + Add placement
                </button>
              </div>
              <div className="rounded-xl bg-white border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#F9F9F7] border-b border-gray-200">
                      {['ID', 'Label', 'Multiplier', 'Effect', ''].map((h, i) => (
                        <th key={i} className="px-4 py-2 text-left text-xs font-bold text-[#555555] uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-3 text-xs text-[#555555]">No placements in this group</td></tr>
                    )}
                    {items.map(({ _i, ...p }) => (
                      <tr key={p.id} className="border-b border-gray-100 last:border-0">
                        <td className="px-4 py-2">
                          <code className="text-xs bg-gray-100 rounded px-1.5 py-0.5 text-[#555555]">{p.id}</code>
                        </td>
                        <td className="px-4 py-2">
                          <input value={p.label} onChange={e => update(_i, 'label', e.target.value)}
                            className="w-36 rounded border border-gray-200 px-2 py-1 text-sm text-[#0A0A0A] focus:outline-none focus:ring-1 focus:ring-[#7B0000]" />
                        </td>
                        <td className="px-4 py-2">
                          <input type="number" min={1} max={3} step={0.01} value={p.multiplier}
                            onChange={e => update(_i, 'multiplier', Number(e.target.value))}
                            className="w-20 rounded border border-gray-200 px-2 py-1 text-sm text-[#0A0A0A] focus:outline-none focus:ring-1 focus:ring-[#7B0000]" />
                        </td>
                        <td className="px-4 py-2 text-[#555555] whitespace-nowrap text-xs">
                          {p.multiplier === 1 ? 'Base rate' : `+${Math.round((p.multiplier - 1) * 100)}% time`}
                        </td>
                        <td className="px-4 py-2">
                          <select value={p.group} onChange={e => update(_i, 'group', e.target.value)}
                            className="rounded border border-gray-200 px-2 py-1 text-xs text-[#0A0A0A] focus:outline-none focus:ring-1 focus:ring-[#7B0000]">
                            {GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                          </select>
                          <button type="button" onPointerDown={() => removePlacement(_i)}
                            className="ml-2 text-xs text-red-500 hover:text-red-700 cursor-pointer">✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
