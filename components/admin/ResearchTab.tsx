'use client'

import { useEffect, useState } from 'react'
import type { IndustryDataset } from '@/lib/trends/types'
import { RESEARCH_MODELS, suggestionToStrand, type ResearchModelId, type SuggestedStrand } from '@/lib/trends/ai-research'
import type { ResearchHistoryEntry } from '@/lib/trends/research-history'

const INDUSTRIES = [
  { id: 'tattoo', label: 'Tattoo' },
  { id: 'fashion', label: 'Fashion' },
  { id: 'walkin', label: 'Walk-in / Flash' },
  { id: 'music', label: 'Music' },
  { id: 'interior', label: 'Interior' },
] as const

interface ApiHistoryResponse { history?: ResearchHistoryEntry[] }
interface ApiRunResponse { entry?: ResearchHistoryEntry; error?: string }

export default function ResearchTab() {
  const [industryId, setIndustryId] = useState<string>('tattoo')
  const [query, setQuery] = useState('')
  const [model, setModel] = useState<ResearchModelId>('claude-opus-4-7')
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [entry, setEntry] = useState<ResearchHistoryEntry | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [applying, setApplying] = useState(false)
  const [applyMessage, setApplyMessage] = useState<string | null>(null)
  const [includeNotes, setIncludeNotes] = useState(true)
  const [history, setHistory] = useState<ResearchHistoryEntry[]>([])

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/research')
      .then(r => r.json() as Promise<ApiHistoryResponse>)
      .then(d => { if (!cancelled) setHistory(d.history ?? []) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [entry])

  async function handleRun() {
    setRunning(true)
    setError(null)
    setEntry(null)
    setApplyMessage(null)
    setSelected(new Set())
    try {
      const res = await fetch('/api/admin/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ industryId, query: query.trim(), model }),
      })
      const data = (await res.json()) as ApiRunResponse
      if (!res.ok) throw new Error(data.error ?? 'Research failed')
      if (!data.entry) throw new Error('Empty response')
      setEntry(data.entry)
      setSelected(new Set(data.entry.result.suggestions.filter(s => s.confidence >= 60).map(s => s.proposed_id)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Research failed')
    } finally {
      setRunning(false)
    }
  }

  function toggleSelected(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  async function handleApply() {
    if (!entry) return
    if (selected.size === 0 && !includeNotes) return
    setApplying(true)
    setApplyMessage(null)
    setError(null)
    try {
      // 1. Load the current dataset.
      const dsRes = await fetch(`/api/trends?industry=${entry.industryId}`)
      if (!dsRes.ok) throw new Error('Failed to load dataset for merge')
      const dataset = (await dsRes.json()) as IndustryDataset

      // 2. Merge selected suggestions and (optionally) cycle notes.
      const existingIds = new Set(dataset.styles.map(s => s.id))
      const additions = entry.result.suggestions
        .filter(s => selected.has(s.proposed_id) && !existingIds.has(s.proposed_id))
        .map(suggestionToStrand)

      const merged: IndustryDataset = {
        ...dataset,
        styles: [...dataset.styles, ...additions],
        cycleNotes: includeNotes && entry.result.cycle_notes_to_add.length > 0
          ? [...dataset.cycleNotes, ...entry.result.cycle_notes_to_add]
          : dataset.cycleNotes,
      }

      // 3. Save.
      const putRes = await fetch('/api/admin/trends', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataset: merged }),
      })
      if (!putRes.ok) {
        const data = await putRes.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to save merged dataset')
      }

      // 4. Mark applied in history.
      if (additions.length > 0) {
        await fetch('/api/admin/research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'mark_applied',
            entryId: entry.id,
            appliedIds: additions.map(a => a.id),
          }),
        }).catch(() => {})
      }

      setApplyMessage(`Applied ${additions.length} strand(s)${includeNotes && entry.result.cycle_notes_to_add.length > 0 ? ` + ${entry.result.cycle_notes_to_add.length} cycle note(s)` : ''}.`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Merge failed')
    } finally {
      setApplying(false)
    }
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-[#0A0A0A] mb-4">AI Trend Research</h2>
      <p className="text-sm text-[#555555] mb-4">
        Ask Claude to surface strands that should exist in the dataset based on your research query. Suggestions are
        previewed first; nothing is written until you click <strong>Apply selected</strong>.
      </p>

      <section className="rounded-xl bg-white border border-gray-200 p-4 mb-5 space-y-3">
        <div className="grid sm:grid-cols-3 gap-3">
          <label className="block text-sm">
            <span className="block text-xs text-[#555555] mb-1">Industry</span>
            <select
              value={industryId}
              onChange={e => setIndustryId(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm bg-white"
            >
              {INDUSTRIES.map(i => <option key={i.id} value={i.id}>{i.label}</option>)}
            </select>
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="block text-xs text-[#555555] mb-1">Model</span>
            <select
              value={model}
              onChange={e => setModel(e.target.value as ResearchModelId)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm bg-white"
            >
              {RESEARCH_MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </label>
        </div>

        <label className="block text-sm">
          <span className="block text-xs text-[#555555] mb-1">Research query</span>
          <textarea
            rows={3}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="e.g. Surface emerging tattoo sub-styles tied to AI-generated reference imagery and 2024-25 social media trends."
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </label>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRun}
            disabled={running || !query.trim()}
            className="rounded-lg bg-[#7B0000] px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
          >
            {running ? 'Researching…' : 'Run research'}
          </button>
          {error && <span className="text-xs text-red-600">{error}</span>}
        </div>
      </section>

      {entry && (
        <section className="rounded-xl bg-white border border-gray-200 p-4 mb-5">
          <div className="flex items-baseline justify-between gap-3 mb-2">
            <h3 className="text-base font-bold text-[#0A0A0A]">Suggestions</h3>
            <span className="text-xs text-[#555555]">
              {entry.result.suggestions.length} strands · {entry.result.cycle_notes_to_add.length} notes ·
              cache {entry.usage.cache_read_input_tokens > 0 ? 'hit' : 'miss'} · {entry.usage.input_tokens + entry.usage.cache_read_input_tokens + entry.usage.cache_creation_input_tokens} in / {entry.usage.output_tokens} out
            </span>
          </div>
          {entry.reasoning && <p className="text-sm text-[#555555] mb-3 italic">{entry.reasoning}</p>}

          {entry.result.suggestions.length === 0 ? (
            <p className="text-sm text-[#555555] py-3">No new strand suggestions for this query.</p>
          ) : (
            <ul className="space-y-2">
              {entry.result.suggestions.map(s => (
                <SuggestionCard
                  key={s.proposed_id}
                  suggestion={s}
                  selected={selected.has(s.proposed_id)}
                  onToggle={() => toggleSelected(s.proposed_id)}
                />
              ))}
            </ul>
          )}

          {entry.result.cycle_notes_to_add.length > 0 && (
            <div className="mt-4 rounded border border-gray-200 p-3">
              <label className="flex items-center gap-2 text-xs text-[#555555] mb-2">
                <input type="checkbox" checked={includeNotes} onChange={e => setIncludeNotes(e.target.checked)} />
                Include {entry.result.cycle_notes_to_add.length} cycle note(s)
              </label>
              <ul className="text-sm text-gray-800 space-y-1">
                {entry.result.cycle_notes_to_add.map((n, i) => <li key={i}>· {n}</li>)}
              </ul>
            </div>
          )}

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={handleApply}
              disabled={applying || (selected.size === 0 && !includeNotes)}
              className="rounded-lg bg-[#7B0000] px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
            >
              {applying ? 'Applying…' : `Apply selected (${selected.size})`}
            </button>
            {applyMessage && <span className="text-xs text-green-700">{applyMessage}</span>}
          </div>
        </section>
      )}

      <section>
        <h3 className="text-sm font-bold text-[#0A0A0A] mb-2">Recent research</h3>
        {history.length === 0 ? (
          <p className="text-xs text-[#555555]">No history yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100 rounded-xl bg-white border border-gray-200">
            {history.slice(0, 12).map(h => (
              <li key={h.id} className="p-3 text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium text-[#0A0A0A] truncate">{h.query}</span>
                  <span className="shrink-0 text-[10px] uppercase tracking-wide text-[#555555]">{h.industryId} · {h.model}</span>
                </div>
                <div className="text-xs text-[#555555] mt-1">
                  {new Date(h.timestamp).toLocaleString()} · {h.suggestionCount} suggestions · {h.appliedIds.length} applied
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function SuggestionCard({
  suggestion: s,
  selected,
  onToggle,
}: {
  suggestion: SuggestedStrand
  selected: boolean
  onToggle: () => void
}) {
  const peaks = s.curve_points.length === 0 ? '—' : s.curve_points.map(p => `${p.year}:${p.value}`).join('  ')
  return (
    <li className={`rounded-lg border p-3 ${selected ? 'border-[#7B0000] bg-[#7B0000]/5' : 'border-gray-200'}`}>
      <label className="flex items-start gap-3 cursor-pointer">
        <input type="checkbox" checked={selected} onChange={onToggle} className="mt-1" />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-semibold text-[#0A0A0A]">{s.label}</span>
            <span className="text-xs text-[#555555]">conf {s.confidence}</span>
          </div>
          <div className="text-xs text-[#555555]">
            <code className="bg-gray-100 rounded px-1">{s.proposed_id}</code>
            <span className="ml-2">origin {s.origin}</span>
            {s.parentId && <span className="ml-2">↳ {s.parentId}</span>}
            {s.ancestors.length > 0 && <span className="ml-2">← {s.ancestors.join(', ')}</span>}
          </div>
          <p className="mt-1 text-sm text-gray-800">{s.tagline}</p>
          {s.description && <p className="mt-1 text-xs text-gray-700">{s.description}</p>}
          <p className="mt-1 text-xs italic text-[#555555]">{s.rationale}</p>
          <div className="mt-1 text-[11px] text-[#555555] font-mono">curve: {peaks}</div>
          {(s.signals.length > 0 || s.tags.length > 0) && (
            <div className="mt-1 flex flex-wrap gap-1">
              {s.signals.map(sig => <span key={`sig-${sig}`} className="text-[10px] rounded-full bg-blue-50 text-blue-800 px-1.5 py-0.5">{sig}</span>)}
              {s.tags.map(t => <span key={`tag-${t}`} className="text-[10px] rounded-full bg-gray-100 text-gray-700 px-1.5 py-0.5">{t}</span>)}
            </div>
          )}
        </div>
      </label>
    </li>
  )
}
