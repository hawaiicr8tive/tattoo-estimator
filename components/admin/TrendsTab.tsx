'use client'

import { useEffect, useMemo, useState } from 'react'
import SaveBar from './SaveBar'
import type { IndustryDataset, PopularityPoint, StyleStrand } from '@/lib/trends/types'

const INDUSTRIES = [
  { id: 'tattoo', label: 'Tattoo' },
  { id: 'fashion', label: 'Fashion' },
  { id: 'music', label: 'Music' },
  { id: 'interior', label: 'Interior' },
] as const

function toSlug(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function blankStrand(): StyleStrand {
  return {
    id: '',
    label: '',
    tagline: '',
    description: '',
    origin: new Date().getFullYear() - 10,
    ancestors: [],
    curve: [],
    signals: [],
    tags: [],
    pioneers: [],
  }
}

export default function TrendsTab() {
  const [industryId, setIndustryId] = useState<string>('tattoo')
  const [dataset, setDataset] = useState<IndustryDataset | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const loading = dataset?.industry.id !== industryId

  useEffect(() => {
    let cancelled = false
    fetch(`/api/trends?industry=${industryId}`)
      .then(r => r.json())
      .then((d: IndustryDataset) => {
        if (cancelled) return
        setDataset(d)
        setError(null)
      })
      .catch(e => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Load failed')
      })
    return () => { cancelled = true }
  }, [industryId])

  async function handleSave() {
    if (!dataset) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/trends', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataset }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Save failed')
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  function updateDataset(patch: Partial<IndustryDataset>) {
    setDataset(prev => (prev ? { ...prev, ...patch } : prev))
  }

  function updateIndustry(patch: Partial<IndustryDataset['industry']>) {
    setDataset(prev => (prev ? { ...prev, industry: { ...prev.industry, ...patch } } : prev))
  }

  function addStrand() {
    const s = blankStrand()
    s.id = `new-strand-${Date.now()}`
    s.label = 'New strand'
    setDataset(prev => (prev ? { ...prev, styles: [...prev.styles, s] } : prev))
    setExpanded(s.id)
  }

  function updateStrand(idx: number, patch: Partial<StyleStrand>) {
    setDataset(prev => {
      if (!prev) return prev
      const styles = prev.styles.slice()
      styles[idx] = { ...styles[idx], ...patch }
      return { ...prev, styles }
    })
  }

  function removeStrand(idx: number) {
    setDataset(prev => {
      if (!prev) return prev
      const styles = prev.styles.filter((_, i) => i !== idx)
      return { ...prev, styles }
    })
  }

  function regenIdFromLabel(idx: number) {
    if (!dataset) return
    const label = dataset.styles[idx].label
    if (!label) return
    let id = toSlug(label)
    const others = dataset.styles.filter((_, i) => i !== idx).map(s => s.id)
    if (others.includes(id)) id = `${id}-${idx}`
    updateStrand(idx, { id })
  }

  return (
    <div>
      <SaveBar
        title="Trend Cycle Data"
        saving={saving}
        saved={saved}
        error={error}
        onSave={handleSave}
      />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <label className="text-sm">
          <span className="block text-xs text-[#555555] mb-1">Industry</span>
          <select
            value={industryId}
            onChange={e => setIndustryId(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2 text-sm bg-white"
          >
            {INDUSTRIES.map(i => <option key={i.id} value={i.id}>{i.label}</option>)}
          </select>
        </label>
        <p className="text-xs text-[#555555] flex-1">
          Edits save to <code className="bg-gray-100 rounded px-1">admin_config[trends:{industryId}]</code>.
          The public <code className="bg-gray-100 rounded px-1">/trends</code> dashboard reads from there with seed fallback.
        </p>
      </div>

      {loading && <p className="text-[#555555] py-12 text-center">Loading dataset…</p>}

      {!loading && dataset && (
        <div className="space-y-5">
          <section className="rounded-xl bg-white border border-gray-200 p-4">
            <h3 className="text-sm font-bold text-[#0A0A0A] mb-3">Industry header</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Label">
                <input
                  value={dataset.industry.label}
                  onChange={e => updateIndustry({ label: e.target.value })}
                  className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                />
              </Field>
              <Field label="Status">
                <select
                  value={dataset.industry.status}
                  onChange={e => updateIndustry({ status: e.target.value as 'active' | 'scaffold' })}
                  className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm bg-white"
                >
                  <option value="active">active</option>
                  <option value="scaffold">scaffold</option>
                </select>
              </Field>
              <Field label="Blurb" className="sm:col-span-2">
                <input
                  value={dataset.industry.blurb}
                  onChange={e => updateIndustry({ blurb: e.target.value })}
                  className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                />
              </Field>
              <Field label="Year range start">
                <input
                  type="number"
                  value={dataset.yearRange.start}
                  onChange={e => updateDataset({ yearRange: { ...dataset.yearRange, start: Number(e.target.value) } })}
                  className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                />
              </Field>
              <Field label="Year range end">
                <input
                  type="number"
                  value={dataset.yearRange.end}
                  onChange={e => updateDataset({ yearRange: { ...dataset.yearRange, end: Number(e.target.value) } })}
                  className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                />
              </Field>
            </div>
            <Field label="Cycle notes (one per line)" className="mt-3">
              <textarea
                rows={Math.max(3, dataset.cycleNotes.length)}
                value={dataset.cycleNotes.join('\n')}
                onChange={e =>
                  updateDataset({ cycleNotes: e.target.value.split('\n').map(s => s).filter(s => s.trim().length > 0) })
                }
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm font-mono"
              />
            </Field>
          </section>

          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-[#0A0A0A]">Strands ({dataset.styles.length})</h3>
              <button
                type="button"
                onClick={addStrand}
                className="rounded-lg bg-[#7B0000] px-3 py-1.5 text-xs font-bold text-white hover:opacity-90"
              >
                + Add strand
              </button>
            </div>
            <div className="space-y-2">
              {dataset.styles.map((s, idx) => (
                <StrandCard
                  key={s.id || idx}
                  index={idx}
                  strand={s}
                  allStrands={dataset.styles}
                  expanded={expanded === s.id}
                  onToggle={() => setExpanded(prev => (prev === s.id ? null : s.id))}
                  onUpdate={patch => updateStrand(idx, patch)}
                  onRemove={() => removeStrand(idx)}
                  onRegenId={() => regenIdFromLabel(idx)}
                />
              ))}
              {dataset.styles.length === 0 && (
                <p className="text-sm text-[#555555] py-6 text-center bg-white rounded-xl border border-dashed border-gray-300">
                  No strands yet — click “Add strand” to seed this industry.
                </p>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-xs text-[#555555] mb-1">{label}</span>
      {children}
    </label>
  )
}

interface StrandCardProps {
  index: number
  strand: StyleStrand
  allStrands: StyleStrand[]
  expanded: boolean
  onToggle: () => void
  onUpdate: (patch: Partial<StyleStrand>) => void
  onRemove: () => void
  onRegenId: () => void
}

function StrandCard({ index, strand, allStrands, expanded, onToggle, onUpdate, onRemove, onRegenId }: StrandCardProps) {
  const ancestorOptions = useMemo(
    () => allStrands.filter(s => s.id !== strand.id && s.id),
    [allStrands, strand.id],
  )

  return (
    <div className="rounded-xl bg-white border border-gray-200">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="min-w-0">
          <div className="font-semibold text-[#0A0A0A] truncate">{strand.label || '(unnamed)'}</div>
          <div className="text-xs text-[#555555] truncate">
            <code className="bg-gray-100 px-1 rounded">{strand.id || '(no id)'}</code>
            <span className="ml-2">origin {strand.origin}</span>
            <span className="ml-2">{strand.curve.length} pts</span>
            {strand.ancestors.length > 0 && <span className="ml-2">← {strand.ancestors.join(', ')}</span>}
          </div>
        </div>
        <span className="text-xs text-[#555555]">{expanded ? '▾' : '▸'}</span>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 p-4 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Label">
              <input
                value={strand.label}
                onChange={e => onUpdate({ label: e.target.value })}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
              />
            </Field>
            <Field label="ID (slug)">
              <div className="flex gap-1.5">
                <input
                  value={strand.id}
                  onChange={e => onUpdate({ id: toSlug(e.target.value) })}
                  className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm font-mono"
                />
                <button
                  type="button"
                  onClick={onRegenId}
                  title="Regenerate from label"
                  className="rounded border border-gray-300 px-2 text-xs hover:bg-gray-50"
                >
                  ↻
                </button>
              </div>
            </Field>
            <Field label="Tagline" className="sm:col-span-2">
              <input
                value={strand.tagline}
                onChange={e => onUpdate({ tagline: e.target.value })}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
              />
            </Field>
            <Field label="Description" className="sm:col-span-2">
              <textarea
                rows={3}
                value={strand.description}
                onChange={e => onUpdate({ description: e.target.value })}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
              />
            </Field>
            <Field label="Origin year">
              <input
                type="number"
                value={strand.origin}
                onChange={e => onUpdate({ origin: Number(e.target.value) })}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
              />
            </Field>
            <Field label="Ancestors">
              <select
                multiple
                value={strand.ancestors}
                onChange={e => onUpdate({ ancestors: Array.from(e.target.selectedOptions).map(o => o.value) })}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm bg-white h-24"
              >
                {ancestorOptions.map(o => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
            </Field>
          </div>

          <CommaList label="Tags" values={strand.tags} onChange={v => onUpdate({ tags: v })} placeholder="bold, monochrome, modern" />
          <CommaList label="Signals" values={strand.signals} onChange={v => onUpdate({ signals: v })} placeholder="instagram-native, nostalgia" />
          <CommaList label="Pioneers" values={strand.pioneers ?? []} onChange={v => onUpdate({ pioneers: v })} placeholder="Sailor Jerry Collins, Dr. Woo" />

          <CurveEditor curve={strand.curve} onChange={c => onUpdate({ curve: c })} />

          <div className="flex justify-end pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => {
                if (confirm(`Remove "${strand.label || strand.id}"?`)) onRemove()
              }}
              className="text-xs text-red-600 hover:text-red-800"
            >
              Remove strand #{index + 1}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function CommaList({ label, values, onChange, placeholder }: {
  label: string; values: string[]; onChange: (v: string[]) => void; placeholder?: string
}) {
  const joined = values.join(', ')
  return (
    <Field label={label}>
      <input
        // Uncontrolled input keyed on current values so external updates remount it.
        key={joined}
        defaultValue={joined}
        onBlur={e => {
          const parsed = e.target.value.split(',').map(s => s.trim()).filter(Boolean)
          if (parsed.join(' ') !== values.join(' ')) onChange(parsed)
        }}
        placeholder={placeholder}
        className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
      />
    </Field>
  )
}

function CurveEditor({ curve, onChange }: { curve: PopularityPoint[]; onChange: (c: PopularityPoint[]) => void }) {
  function addPoint() {
    const last = curve[curve.length - 1]
    const year = last ? last.year + 5 : new Date().getFullYear()
    onChange([...curve, { year, value: 50 }].sort((a, b) => a.year - b.year))
  }
  function update(i: number, patch: Partial<PopularityPoint>) {
    const next = curve.slice()
    next[i] = { ...next[i], ...patch }
    onChange(next.sort((a, b) => a.year - b.year))
  }
  function remove(i: number) {
    onChange(curve.filter((_, idx) => idx !== i))
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-[#555555]">Popularity curve (year → 0–100)</span>
        <button type="button" onClick={addPoint} className="text-xs underline text-[#7B0000]">+ Add point</button>
      </div>
      {curve.length === 0 ? (
        <p className="text-xs text-[#555555] italic">No curve points — engine will treat as no signal.</p>
      ) : (
        <div className="space-y-1">
          {curve.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="number"
                value={p.year}
                onChange={e => update(i, { year: Number(e.target.value) })}
                className="w-24 rounded border border-gray-300 px-2 py-1 text-sm"
              />
              <input
                type="range"
                min={0} max={100} step={1}
                value={p.value}
                onChange={e => update(i, { value: Number(e.target.value) })}
                className="flex-1 accent-[#7B0000]"
              />
              <input
                type="number"
                min={0} max={100}
                value={p.value}
                onChange={e => update(i, { value: Number(e.target.value) })}
                className="w-16 rounded border border-gray-300 px-2 py-1 text-sm"
              />
              <button type="button" onClick={() => remove(i)} className="text-xs text-red-600 hover:text-red-800">×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
