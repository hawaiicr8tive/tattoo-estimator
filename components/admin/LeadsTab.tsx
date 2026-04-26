'use client'
import { useState, useEffect, useMemo } from 'react'
import type { Lead } from '@/lib/types'

const CSV_COLUMNS: { key: keyof Lead; label: string }[] = [
  { key: 'created_at', label: 'Date' },
  { key: 'first_name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'style', label: 'Style' },
  { key: 'size', label: 'Size' },
  { key: 'placement', label: 'Placement' },
  { key: 'is_color', label: 'Color' },
  { key: 'price_min', label: 'Price Min' },
  { key: 'price_max', label: 'Price Max' },
  { key: 'hours_min', label: 'Hours Min' },
  { key: 'hours_max', label: 'Hours Max' },
  { key: 'opted_in', label: 'Opted In' },
  { key: 'matched_artists', label: 'Matched Artists' },
  { key: 'source', label: 'Source' },
  { key: 'notes', label: 'Notes' },
]

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return ''
  let s: string
  if (Array.isArray(value)) s = value.join('; ')
  else if (typeof value === 'boolean') s = value ? 'yes' : 'no'
  else s = String(value)
  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`
  return s
}

function buildCsv(rows: Lead[]): string {
  const header = CSV_COLUMNS.map(c => c.label).join(',')
  const lines = rows.map(r => CSV_COLUMNS.map(c => csvEscape(r[c.key])).join(','))
  return [header, ...lines].join('\r\n')
}

function downloadCsv(filename: string, contents: string) {
  const blob = new Blob([contents], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function LeadsTab() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [pendingFrom, setPendingFrom] = useState('')
  const [pendingTo, setPendingTo] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let cancelled = false
    const params = new URLSearchParams()
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    const qs = params.toString()

    fetch(`/api/admin/leads${qs ? `?${qs}` : ''}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        if (data?.error) {
          setError(data.error)
        } else {
          setLeads(data)
          setSelectedIds(new Set())
          setError(null)
        }
        setLoading(false)
      })
      .catch(e => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Failed to load')
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [from, to, refreshKey])

  const allVisibleIds = useMemo(
    () => leads.map(l => l.id).filter((id): id is string => typeof id === 'string'),
    [leads]
  )
  const allSelected = allVisibleIds.length > 0 && allVisibleIds.every(id => selectedIds.has(id))
  const someSelected = selectedIds.size > 0 && !allSelected

  function toggleAll() {
    setSelectedIds(allSelected ? new Set() : new Set(allVisibleIds))
  }

  function toggleOne(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleDelete() {
    if (selectedIds.size === 0) return
    const n = selectedIds.size
    if (!window.confirm(`Delete ${n} lead${n === 1 ? '' : 's'}? This can't be undone.`)) return
    setDeleting(true)
    try {
      const res = await fetch('/api/admin/leads', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Delete failed')
      setRefreshKey(k => k + 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  function handleExport() {
    if (leads.length === 0) return
    const stamp = new Date().toISOString().slice(0, 10)
    downloadCsv(`leads-${stamp}.csv`, buildCsv(leads))
  }

  function applyDates() {
    setFrom(pendingFrom)
    setTo(pendingTo)
  }

  function clearDates() {
    setPendingFrom('')
    setPendingTo('')
    setFrom('')
    setTo('')
  }

  const datesDirty = pendingFrom !== from || pendingTo !== to
  const datesActive = from !== '' || to !== ''

  const INPUT = 'rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#0A0A0A] focus:outline-none focus:ring-2 focus:ring-[#7B0000] focus:border-transparent'

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-lg font-bold text-[#0A0A0A]">Leads</h2>
        <span className="text-sm text-[#555555]">
          {leads.length} shown{selectedIds.size > 0 ? ` · ${selectedIds.size} selected` : ''}
        </span>
      </div>

      <div className="flex items-end justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-end gap-3 flex-wrap">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-[#555555]">From</span>
            <input
              type="date"
              value={pendingFrom}
              onChange={e => setPendingFrom(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && applyDates()}
              className={INPUT}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-[#555555]">To</span>
            <input
              type="date"
              value={pendingTo}
              onChange={e => setPendingTo(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && applyDates()}
              className={INPUT}
            />
          </label>
          <button
            type="button"
            onClick={applyDates}
            disabled={!datesDirty}
            className="rounded-lg bg-[#7B0000] px-3 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Apply
          </button>
          {(datesActive || datesDirty) && (
            <button
              type="button"
              onClick={clearDates}
              className="text-xs text-[#555555] hover:text-[#0A0A0A] underline pb-2 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDelete}
            disabled={selectedIds.size === 0 || deleting}
            className="rounded-lg bg-red-600 px-3 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {deleting ? 'Deleting…' : `Delete${selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}`}
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={leads.length === 0}
            className="rounded-lg bg-[#0A0A0A] px-3 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Download CSV
          </button>
        </div>
      </div>

      {loading && <p className="text-[#555555] py-8 text-center">Loading…</p>}
      {error && <p className="text-red-600 py-4">{error}</p>}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-xl bg-white border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F9F9F7] border-b border-gray-200">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={el => { if (el) el.indeterminate = someSelected }}
                    onChange={toggleAll}
                    aria-label="Select all"
                    className="cursor-pointer accent-[#7B0000]"
                  />
                </th>
                {['Date', 'Name', 'Email', 'Style', 'Size', 'Placement', 'Color', 'Estimate', 'Opted In', 'Notes'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold text-[#555555] uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leads.map((lead, i) => {
                const id = lead.id
                const checked = id ? selectedIds.has(id) : false
                return (
                  <tr key={id ?? i} className={`border-b border-gray-100 last:border-0 ${i % 2 === 1 ? 'bg-[#F9F9F7]/50' : ''} ${checked ? 'bg-[#7B0000]/5' : ''}`}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => id && toggleOne(id)}
                        disabled={!id}
                        aria-label={`Select ${lead.first_name}`}
                        className="cursor-pointer accent-[#7B0000]"
                      />
                    </td>
                    <td className="px-4 py-3 text-[#555555] whitespace-nowrap text-xs">
                      {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 font-medium text-[#0A0A0A]">{lead.first_name}</td>
                    <td className="px-4 py-3 text-[#555555] text-xs">{lead.email}</td>
                    <td className="px-4 py-3 text-[#555555] capitalize text-xs">{lead.style}</td>
                    <td className="px-4 py-3 text-[#555555] capitalize text-xs">{lead.size}</td>
                    <td className="px-4 py-3 text-[#555555] text-xs">{lead.placement}</td>
                    <td className="px-4 py-3 text-[#555555] text-xs">{lead.is_color ? 'Color' : 'B&G'}</td>
                    <td className="px-4 py-3 font-medium text-[#0A0A0A] whitespace-nowrap text-xs">
                      ${lead.price_min.toLocaleString()}–${lead.price_max.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center text-green-600">{lead.opted_in ? '✓' : ''}</td>
                    <td className="px-4 py-3 text-[#555555] text-xs max-w-[200px] truncate">{lead.notes || '—'}</td>
                  </tr>
                )
              })}
              {leads.length === 0 && (
                <tr><td colSpan={11} className="px-4 py-12 text-center text-[#555555]">No leads found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
