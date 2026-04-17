'use client'
import { useState } from 'react'
import SaveBar from './SaveBar'
import type { AdminStyle } from '@/lib/admin-types'

interface Props { initialData: AdminStyle[] }

const BUILT_IN_IDS = new Set(['fine-line', 'traditional', 'realism', 'polynesian', 'geometric'])

function toSlug(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

const BLANK: Omit<AdminStyle, 'id'> = { label: '', description: '', multiplier: 1.0 }

export default function StylesTab({ initialData }: Props) {
  const [styles, setStyles] = useState<AdminStyle[]>(initialData)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newStyle, setNewStyle] = useState<Omit<AdminStyle, 'id'> | null>(null)

  function update(index: number, field: keyof AdminStyle, value: string | number) {
    setStyles(s => s.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  function removeStyle(index: number) {
    setStyles(s => s.filter((_, i) => i !== index))
  }

  function addStyle() {
    if (!newStyle) return
    const label = newStyle.label.trim()
    if (!label) return
    const id = toSlug(label) || `style-${Date.now()}`
    if (styles.some(s => s.id === id)) {
      setError(`A style with ID "${id}" already exists`)
      return
    }
    setStyles(s => [...s, { id, ...newStyle, label }])
    setNewStyle(null)
  }

  async function handleSave() {
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'styles', data: styles }),
      })
      if (!res.ok) throw new Error('Save failed')
      setSaved(true); setTimeout(() => setSaved(false), 2500)
    } catch (e) { setError(e instanceof Error ? e.message : 'Error') }
    finally { setSaving(false) }
  }

  const previewId = newStyle ? toSlug(newStyle.label) || '…' : ''

  return (
    <div>
      <SaveBar title="Tattoo Styles" saving={saving} saved={saved} error={error} onSave={handleSave} />
      <p className="text-sm text-[#555555] mb-4">
        Built-in style IDs are fixed. Custom styles appear in the estimator automatically after saving.
      </p>

      <div className="rounded-xl bg-white border border-gray-200 overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F9F9F7] border-b border-gray-200">
              {['ID', 'Label', 'Description', 'Multiplier', 'Effect', ''].map((h, i) => (
                <th key={i} className="px-4 py-3 text-left text-xs font-bold text-[#555555] uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {styles.map((style, i) => {
              const isBuiltIn = BUILT_IN_IDS.has(style.id)
              return (
                <tr key={style.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3">
                    <code className="text-xs bg-gray-100 rounded px-1.5 py-0.5 text-[#555555]">{style.id}</code>
                    {!isBuiltIn && (
                      <span className="ml-1.5 text-xs bg-blue-50 text-blue-700 rounded px-1 py-0.5">custom</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <input value={style.label} onChange={e => update(i, 'label', e.target.value)}
                      className="w-full min-w-[160px] rounded border border-gray-200 px-2 py-1 text-sm text-[#0A0A0A] focus:outline-none focus:ring-1 focus:ring-[#7B0000]" />
                  </td>
                  <td className="px-4 py-3">
                    <input value={style.description} onChange={e => update(i, 'description', e.target.value)}
                      className="w-full min-w-[220px] rounded border border-gray-200 px-2 py-1 text-sm text-[#0A0A0A] focus:outline-none focus:ring-1 focus:ring-[#7B0000]" />
                  </td>
                  <td className="px-4 py-3">
                    <input type="number" min={0.5} max={3} step={0.01} value={style.multiplier}
                      onChange={e => update(i, 'multiplier', Number(e.target.value))}
                      className="w-20 rounded border border-gray-200 px-2 py-1 text-sm text-[#0A0A0A] focus:outline-none focus:ring-1 focus:ring-[#7B0000]" />
                  </td>
                  <td className="px-4 py-3 text-[#555555] whitespace-nowrap text-xs">
                    {style.multiplier === 1 ? 'Base rate' : `+${Math.round((style.multiplier - 1) * 100)}% time`}
                  </td>
                  <td className="px-4 py-3">
                    {!isBuiltIn && (
                      <button type="button" onClick={() => removeStyle(i)}
                        className="text-xs text-red-500 hover:text-red-700 cursor-pointer whitespace-nowrap">
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Add new style form */}
      {newStyle ? (
        <div className="rounded-xl bg-white border-2 border-[#7B0000] p-4">
          <p className="text-xs font-bold text-[#7B0000] uppercase tracking-wide mb-3">New Style</p>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-3">
            <div className="sm:col-span-1">
              <label className="block text-xs text-[#555555] mb-1">Label <span className="text-red-500">*</span></label>
              <input
                value={newStyle.label}
                onChange={e => setNewStyle({ ...newStyle, label: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && addStyle()}
                placeholder="e.g. Watercolor"
                autoFocus
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-[#0A0A0A] focus:outline-none focus:ring-1 focus:ring-[#7B0000]"
              />
              {previewId && (
                <p className="mt-1 text-xs text-[#555555]">
                  ID: <code className="bg-gray-100 rounded px-1">{previewId}</code>
                </p>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-[#555555] mb-1">Description</label>
              <input
                value={newStyle.description}
                onChange={e => setNewStyle({ ...newStyle, description: e.target.value })}
                placeholder="One-line description shown to customers"
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-[#0A0A0A] focus:outline-none focus:ring-1 focus:ring-[#7B0000]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#555555] mb-1">Multiplier</label>
              <input
                type="number" min={0.5} max={3} step={0.01} value={newStyle.multiplier}
                onChange={e => setNewStyle({ ...newStyle, multiplier: Number(e.target.value) })}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-[#0A0A0A] focus:outline-none focus:ring-1 focus:ring-[#7B0000]"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={addStyle} disabled={!newStyle.label.trim()}
              className="rounded-lg bg-[#7B0000] px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 cursor-pointer">
              Add Style
            </button>
            <button type="button" onClick={() => setNewStyle(null)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-[#555555] hover:bg-gray-50 cursor-pointer">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onPointerDown={() => setNewStyle({ ...BLANK })}
          className="rounded-lg border-2 border-dashed border-gray-300 px-5 py-3 text-sm font-medium text-[#555555] hover:border-[#7B0000] hover:text-[#7B0000] transition-colors cursor-pointer w-full">
          + Add New Style
        </button>
      )}
    </div>
  )
}
