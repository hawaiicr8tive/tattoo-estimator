'use client'
import { useState } from 'react'
import SaveBar from './SaveBar'
import type { AdminSize } from '@/lib/admin-types'

interface Props { initialData: AdminSize[] }

export default function SizesTab({ initialData }: Props) {
  const [sizes, setSizes] = useState<AdminSize[]>(initialData)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function update(index: number, field: keyof AdminSize, value: string | number) {
    setSizes(s => s.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  async function handleSave() {
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/admin/config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'sizes', data: sizes }) })
      if (!res.ok) throw new Error('Save failed')
      setSaved(true); setTimeout(() => setSaved(false), 2500)
    } catch (e) { setError(e instanceof Error ? e.message : 'Error') }
    finally { setSaving(false) }
  }

  return (
    <div>
      <SaveBar title="Tattoo Sizes" saving={saving} saved={saved} error={error} onSave={handleSave} />
      <p className="text-sm text-[#555555] mb-4">Hour ranges drive the pricing calculation. Labels and descriptions are shown to customers.</p>

      <div className="rounded-xl bg-white border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F9F9F7] border-b border-gray-200">
              {['ID', 'Label', 'Dimensions', 'Analog', 'Min Hours', 'Max Hours', 'Note'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-bold text-[#555555] uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sizes.map((size, i) => (
              <tr key={size.id} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-3">
                  <code className="text-xs bg-gray-100 rounded px-1.5 py-0.5 text-[#555555]">{size.id}</code>
                </td>
                <td className="px-4 py-3">
                  <input value={size.label} onChange={e => update(i, 'label', e.target.value)}
                    className="w-28 rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#7B0000] text-[#0A0A0A]" />
                </td>
                <td className="px-4 py-3">
                  <input value={size.dims} onChange={e => update(i, 'dims', e.target.value)}
                    className="w-24 rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#7B0000] text-[#0A0A0A]" />
                </td>
                <td className="px-4 py-3">
                  <input value={size.analog} onChange={e => update(i, 'analog', e.target.value)}
                    className="w-32 rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#7B0000] text-[#0A0A0A]" />
                </td>
                <td className="px-4 py-3">
                  <input type="number" min={0} step={0.5} value={size.hoursMin}
                    onChange={e => update(i, 'hoursMin', Number(e.target.value))}
                    className="w-18 rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#7B0000] text-[#0A0A0A]" />
                </td>
                <td className="px-4 py-3">
                  <input type="number" min={0} step={0.5} value={size.hoursMax}
                    onChange={e => update(i, 'hoursMax', Number(e.target.value))}
                    className="w-18 rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#7B0000] text-[#0A0A0A]" />
                </td>
                <td className="px-4 py-3">
                  <input value={size.note} onChange={e => update(i, 'note', e.target.value)}
                    placeholder="Optional note…"
                    className="w-48 rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#7B0000] text-[#0A0A0A]" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
