'use client'
import { useState } from 'react'
import SaveBar from './SaveBar'
import type { AdminSize, XlConfig } from '@/lib/admin-types'

interface Props {
  initialData: AdminSize[]
  initialXl: XlConfig
}

export default function SizesTab({ initialData, initialXl }: Props) {
  const [sizes, setSizes] = useState<AdminSize[]>(initialData)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [xl, setXl] = useState<XlConfig>(initialXl)
  const [savingXl, setSavingXl] = useState(false)
  const [savedXl, setSavedXl] = useState(false)
  const [errorXl, setErrorXl] = useState<string | null>(null)

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

  async function handleSaveXl() {
    setSavingXl(true); setErrorXl(null)
    try {
      const res = await fetch('/api/admin/config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'xlConfig', data: xl }) })
      if (!res.ok) throw new Error('Save failed')
      setSavedXl(true); setTimeout(() => setSavedXl(false), 2500)
    } catch (e) { setErrorXl(e instanceof Error ? e.message : 'Error') }
    finally { setSavingXl(false) }
  }

  function updateXlRange(field: 'halfDayRate' | 'fullDayRate' | 'sessionsRange', bound: 'min' | 'max', value: number) {
    setXl(c => ({ ...c, [field]: { ...c[field], [bound]: value } }))
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

      <div className="mt-10">
        <SaveBar title="XL / Custom Day Rates" saving={savingXl} saved={savedXl} error={errorXl} onSave={handleSaveXl} />
        <p className="text-sm text-[#555555] mb-4">
          XL pieces (sleeves, backpieces, full custom) show day-rate ranges and an estimated session count instead of hourly pricing.
        </p>

        <div className="rounded-xl bg-white border border-gray-200 p-5 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <RatePair
              label="Half-Day Rate"
              hint="~3–4 hours of work"
              min={xl.halfDayRate.min}
              max={xl.halfDayRate.max}
              prefix="$"
              onMin={v => updateXlRange('halfDayRate', 'min', v)}
              onMax={v => updateXlRange('halfDayRate', 'max', v)}
            />
            <RatePair
              label="Full-Day Rate"
              hint="~6–8 hours of work"
              min={xl.fullDayRate.min}
              max={xl.fullDayRate.max}
              prefix="$"
              onMin={v => updateXlRange('fullDayRate', 'min', v)}
              onMax={v => updateXlRange('fullDayRate', 'max', v)}
            />
          </div>

          <RatePair
            label="Estimated Sessions"
            hint="Range shown to customers — final count confirmed at consultation"
            min={xl.sessionsRange.min}
            max={xl.sessionsRange.max}
            onMin={v => updateXlRange('sessionsRange', 'min', v)}
            onMax={v => updateXlRange('sessionsRange', 'max', v)}
          />

          <div>
            <label className="block text-sm font-semibold text-[#0A0A0A] mb-1">Disclaimer Text</label>
            <textarea
              value={xl.disclaimer}
              onChange={e => setXl(c => ({ ...c, disclaimer: e.target.value }))}
              rows={2}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-[#0A0A0A] focus:outline-none focus:ring-1 focus:ring-[#7B0000]"
            />
            <p className="mt-1 text-xs text-[#555555]">Shown below the rates on the customer&rsquo;s results page.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function RatePair({ label, hint, min, max, prefix, onMin, onMax }: {
  label: string
  hint?: string
  min: number
  max: number
  prefix?: string
  onMin: (v: number) => void
  onMax: (v: number) => void
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-[#0A0A0A] mb-1">{label}</label>
      <div className="flex items-center gap-2">
        {prefix && <span className="text-sm text-[#555555]">{prefix}</span>}
        <input type="number" min={0} value={min} onChange={e => onMin(Number(e.target.value))}
          className="w-24 rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#7B0000] text-[#0A0A0A]" />
        <span className="text-sm text-[#555555]">–</span>
        {prefix && <span className="text-sm text-[#555555]">{prefix}</span>}
        <input type="number" min={0} value={max} onChange={e => onMax(Number(e.target.value))}
          className="w-24 rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#7B0000] text-[#0A0A0A]" />
      </div>
      {hint && <p className="mt-1 text-xs text-[#555555]">{hint}</p>}
    </div>
  )
}
