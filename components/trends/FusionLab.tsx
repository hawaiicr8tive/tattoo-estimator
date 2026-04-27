'use client'

import { useEffect, useMemo, useState } from 'react'
import type { FusionInput, FusionResult, StyleStrand } from '@/lib/trends/types'
import { fuseStyles } from '@/lib/trends/engine'

const RESEARCH_MODELS = [
  { id: 'claude-opus-4-7', label: 'Opus 4.7' },
  { id: 'claude-sonnet-4-6', label: 'Sonnet 4.6' },
  { id: 'claude-haiku-4-5', label: 'Haiku 4.5' },
] as const
type ResearchModelId = (typeof RESEARCH_MODELS)[number]['id']

const IMAGE_MODELS = [
  { id: 'gemini-3.1-flash-image-preview', label: 'Nano Banana 2 (Flash)', priceHint: '~$0.07/image · faster' },
  { id: 'gemini-3-pro-image-preview', label: 'Gemini 3 Pro Image', priceHint: '~$0.15/image · higher quality' },
] as const
type ImageModelId = (typeof IMAGE_MODELS)[number]['id']

interface FusionImage {
  url: string
  prompt: string
  createdAt: string
  model: string
}

interface MotifCategory { id: string; label: string; description?: string }
interface MotifItem { id: string; label: string; categoryId: string; industries: string[] }
interface MotifLibrary { categories: MotifCategory[]; items: MotifItem[] }

function itemAppliesToIndustry(item: MotifItem, industryId: string): boolean {
  return item.industries.includes('*') || item.industries.includes(industryId)
}

interface FusionHistoryEntry {
  id: string
  timestamp: string
  industryId: string
  baseStyleId: string
  blendStyleId: string
  fusionName: string
  model: string
  analysis: string
  visualDescriptor?: string
  usage: { input_tokens: number; output_tokens: number; cache_read_input_tokens: number; cache_creation_input_tokens: number }
  images?: FusionImage[]
}

interface Props {
  styles: StyleStrand[]
  currentYear: number
  industryId: string
}

interface AnalysisState {
  entryId: string
  analysis: string
  visualDescriptor: string
  model: string
  fusionName: string
  baseLabel: string
  blendLabel: string
  usage: { input_tokens: number; output_tokens: number; cache_read_input_tokens: number; cache_creation_input_tokens: number }
  images: FusionImage[]
}

export default function FusionLab({ styles, currentYear, industryId }: Props) {
  const [baseId, setBaseId] = useState(styles[0]?.id ?? '')
  const [blendId, setBlendId] = useState(styles[1]?.id ?? styles[0]?.id ?? '')
  const [blendWeight, setBlendWeight] = useState(45)
  const [socialAccelerant, setSocialAccelerant] = useState(70)
  const [anomaly, setAnomaly] = useState(40)
  const [extraSignal, setExtraSignal] = useState('')
  const [extraSignals, setExtraSignals] = useState<string[]>([])
  const [model, setModel] = useState<ResearchModelId>('claude-opus-4-7')
  const [researching, setResearching] = useState(false)
  const [analysis, setAnalysis] = useState<AnalysisState | null>(null)
  const [researchError, setResearchError] = useState<string | null>(null)
  const [imageCount, setImageCount] = useState(4)
  const [imageModel, setImageModel] = useState<ImageModelId>('gemini-3.1-flash-image-preview')
  const [generatingImages, setGeneratingImages] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const [chaos, setChaos] = useState(0)
  /** Editable copy of the visualDescriptor — synced from analysis on load, then user-mutable. */
  const [editedVisualDescriptor, setEditedVisualDescriptor] = useState('')
  const [history, setHistory] = useState<FusionHistoryEntry[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [library, setLibrary] = useState<MotifLibrary | null>(null)
  const [contentCategoryId, setContentCategoryId] = useState<string>('')
  const [contentItemId, setContentItemId] = useState<string>('')

  const base = styles.find(s => s.id === baseId)
  const blend = styles.find(s => s.id === blendId)

  const filteredLibrary = useMemo(() => {
    if (!library) return null
    const items = library.items.filter(i => itemAppliesToIndustry(i, industryId))
    const usedCategoryIds = new Set(items.map(i => i.categoryId))
    const categories = library.categories.filter(c => usedCategoryIds.has(c.id))
    return { categories, items }
  }, [library, industryId])

  // Derived effective ids — when industry changes, stale category/item ids
  // are silently treated as "Auto / N/A" without triggering a state-reset effect.
  const effectiveCategoryId = useMemo(
    () => (filteredLibrary?.categories.some(c => c.id === contentCategoryId) ? contentCategoryId : ''),
    [filteredLibrary, contentCategoryId],
  )
  const effectiveItemId = useMemo(
    () => (
      effectiveCategoryId && filteredLibrary?.items.some(i => i.id === contentItemId && i.categoryId === effectiveCategoryId)
        ? contentItemId
        : ''
    ),
    [filteredLibrary, contentItemId, effectiveCategoryId],
  )

  const itemsInSelectedCategory = useMemo(() => {
    if (!filteredLibrary || !effectiveCategoryId) return []
    return filteredLibrary.items.filter(i => i.categoryId === effectiveCategoryId)
  }, [filteredLibrary, effectiveCategoryId])

  const selectedContent = useMemo(() => {
    if (!filteredLibrary || !effectiveItemId) return null
    const item = filteredLibrary.items.find(i => i.id === effectiveItemId)
    if (!item) return null
    const cat = filteredLibrary.categories.find(c => c.id === item.categoryId)
    return { itemLabel: item.label, categoryLabel: cat?.label ?? item.categoryId }
  }, [filteredLibrary, effectiveItemId])

  const result: FusionResult | null = useMemo(() => {
    if (!base || !blend) return null
    const input: FusionInput = {
      baseStyleId: base.id,
      blendStyleId: blend.id,
      blendWeight,
      socialAccelerant,
      anomaly,
      extraSignals,
      contentFocus: selectedContent ?? undefined,
    }
    return fuseStyles(base, blend, input, currentYear)
  }, [base, blend, blendWeight, socialAccelerant, anomaly, extraSignals, currentYear, selectedContent])

  // Pull fusion-research history once on mount; refresh after writes.
  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/research/fusion')
      .then(r => r.json())
      .then((d: { history?: FusionHistoryEntry[] }) => {
        if (!cancelled) setHistory(d.history ?? [])
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  // Pull the motif library once.
  useEffect(() => {
    let cancelled = false
    fetch('/api/motif-library')
      .then(r => r.json())
      .then((d: MotifLibrary) => { if (!cancelled) setLibrary(d) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])


  function entryToAnalysisState(entry: FusionHistoryEntry, baseLabel: string, blendLabel: string): AnalysisState {
    return {
      entryId: entry.id,
      analysis: entry.analysis,
      visualDescriptor: entry.visualDescriptor ?? '',
      model: entry.model,
      fusionName: entry.fusionName,
      baseLabel,
      blendLabel,
      usage: entry.usage,
      images: entry.images ?? [],
    }
  }

  async function refreshHistory(): Promise<FusionHistoryEntry[]> {
    try {
      const r = await fetch('/api/admin/research/fusion')
      const d = (await r.json()) as { history?: FusionHistoryEntry[] }
      const next = d.history ?? []
      setHistory(next)
      return next
    } catch {
      return history
    }
  }

  async function handleResearch() {
    if (!base || !blend || !result) return
    setResearching(true)
    setResearchError(null)
    setAnalysis(null)
    setImageError(null)
    try {
      const res = await fetch('/api/admin/research/fusion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          industryId,
          baseStyleId: base.id,
          blendStyleId: blend.id,
          blendWeight,
          socialAccelerant,
          anomaly,
          extraSignals,
          fusionName: result.name,
          model,
          contentFocus: selectedContent ?? undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Research failed')
      const next = entryToAnalysisState(data.entry, base.label, blend.label)
      setAnalysis(next)
      setEditedVisualDescriptor(next.visualDescriptor)
      refreshHistory()
    } catch (e) {
      setResearchError(e instanceof Error ? e.message : 'Research failed')
    } finally {
      setResearching(false)
    }
  }

  async function handleGenerateImages() {
    if (!analysis) return
    setGeneratingImages(true)
    setImageError(null)
    try {
      const res = await fetch('/api/admin/research/fusion/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryId: analysis.entryId,
          count: imageCount,
          chaos,
          imageModel,
          // Override only if the user has edited away from the stored value.
          visualDescriptor: editedVisualDescriptor.trim() && editedVisualDescriptor !== analysis.visualDescriptor
            ? editedVisualDescriptor
            : undefined,
          contentFocus: selectedContent ?? undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Image generation failed')
      const updated = data.entry as FusionHistoryEntry | null
      if (updated) {
        setAnalysis(prev => (prev ? { ...prev, images: updated.images ?? [] } : prev))
      }
      refreshHistory()
    } catch (e) {
      setImageError(e instanceof Error ? e.message : 'Image generation failed')
    } finally {
      setGeneratingImages(false)
    }
  }

  function reopenHistoryEntry(entry: FusionHistoryEntry) {
    const baseStrand = styles.find(s => s.id === entry.baseStyleId)
    const blendStrand = styles.find(s => s.id === entry.blendStyleId)
    const next = entryToAnalysisState(
      entry,
      baseStrand?.label ?? entry.baseStyleId,
      blendStrand?.label ?? entry.blendStyleId,
    )
    setAnalysis(next)
    setEditedVisualDescriptor(next.visualDescriptor)
    setImageError(null)
    setResearchError(null)
  }

  function addSignal() {
    const t = extraSignal.trim()
    if (!t) return
    setExtraSignals(prev => Array.from(new Set([...prev, t])))
    setExtraSignal('')
  }

  function removeSignal(s: string) {
    setExtraSignals(prev => prev.filter(x => x !== s))
  }

  return (
    <div className="grid md:grid-cols-2 gap-5">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Base strand</div>
            <select
              value={baseId}
              onChange={e => setBaseId(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm bg-white"
            >
              {styles.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
          <label className="block">
            <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Blend strand</div>
            <select
              value={blendId}
              onChange={e => setBlendId(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm bg-white"
            >
              {styles.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
        </div>

        {filteredLibrary && filteredLibrary.categories.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Content focus — category</div>
              <select
                value={effectiveCategoryId}
                onChange={e => { setContentCategoryId(e.target.value); setContentItemId('') }}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm bg-white"
              >
                <option value="">Auto / N/A</option>
                {filteredLibrary.categories.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Content focus — item</div>
              <select
                value={effectiveItemId}
                onChange={e => setContentItemId(e.target.value)}
                disabled={!effectiveCategoryId}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm bg-white disabled:opacity-60"
              >
                <option value="">{effectiveCategoryId ? 'Auto / N/A' : 'pick a category'}</option>
                {itemsInSelectedCategory.map(i => (
                  <option key={i.id} value={i.id}>{i.label}</option>
                ))}
              </select>
            </label>
          </div>
        )}

        <Slider label="Blend weight (toward blend strand)" value={blendWeight} setValue={setBlendWeight} hint={`${100 - blendWeight}% / ${blendWeight}%`} />
        <Slider label="Social accelerant" value={socialAccelerant} setValue={setSocialAccelerant} hint="How hard the algorithm is pushing this aesthetic" />
        <Slider label="Anomaly / rule-breaking" value={anomaly} setValue={setAnomaly} hint="0 = canon-faithful, 100 = chaos" />

        <div>
          <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Extra signals</div>
          <div className="flex gap-2">
            <input
              value={extraSignal}
              onChange={e => setExtraSignal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSignal() } }}
              placeholder="e.g. AI-generated reference, ambient core, wearable archive"
              className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm bg-white"
            />
            <button
              type="button"
              onClick={addSignal}
              className="rounded bg-gray-900 text-white text-sm px-3 py-2 hover:bg-gray-800"
            >Add</button>
          </div>
          {extraSignals.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {extraSignals.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => removeSignal(s)}
                  className="text-xs rounded-full border border-gray-300 px-2 py-0.5 bg-white hover:bg-gray-100"
                  title="Click to remove"
                >
                  {s} ×
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        {result ? (
          <>
            <div className="flex items-baseline justify-between gap-4">
              <h3 className="text-lg font-bold text-gray-900 capitalize">{result.name}</h3>
              <div className="text-right">
                <div className="text-2xl font-bold tabular-nums text-gray-900">{result.plausibility}</div>
                <div className="text-[10px] uppercase tracking-wide text-gray-500">plausibility</div>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
              <Stat label="Cycle compression" value={`${result.cycleCompression}%`} />
              <Stat label="Years to emergence" value={result.yearsToEmergence === 0 ? 'now' : `${result.yearsToEmergence}y`} />
            </div>
            <p className="mt-3 text-sm text-gray-700 leading-relaxed">{result.outlook}</p>

            <div className="mt-4">
              <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Visual ingredients</div>
              <ul className="text-sm text-gray-800 space-y-1">
                {result.ingredients.map(it => <li key={it}>· {it}</li>)}
              </ul>
            </div>
            <div className="mt-3">
              <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Carrying signals</div>
              <div className="flex flex-wrap gap-1.5">
                {result.signals.map(s => (
                  <span key={s} className="text-xs rounded-full bg-gray-100 px-2 py-0.5 text-gray-800">{s}</span>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-xs uppercase tracking-wide text-gray-500">Deep research</span>
                <select
                  value={model}
                  onChange={e => setModel(e.target.value as ResearchModelId)}
                  className="text-xs rounded border border-gray-300 px-2 py-1 bg-white"
                >
                  {RESEARCH_MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
                <button
                  type="button"
                  onClick={handleResearch}
                  disabled={researching || !base || !blend}
                  className="rounded bg-gray-900 text-white text-xs px-3 py-1.5 hover:bg-gray-800 disabled:opacity-50"
                >
                  {researching ? 'Researching…' : 'Research this fusion'}
                </button>
              </div>
              <p className="text-[11px] text-gray-500">
                Sends the fusion + dataset to Claude for a grounded prose analysis (who&apos;s already producing
                this, carrier signals, comparable historical fusions, what could kill it).
              </p>
              {researchError && <p className="mt-2 text-xs text-red-600">{researchError}</p>}
            </div>

            {analysis && (
              <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="flex items-baseline justify-between gap-3 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-gray-700">
                    Analysis: {analysis.fusionName}
                  </span>
                  <span className="text-[10px] text-gray-500">
                    {analysis.model} · {analysis.usage.input_tokens + analysis.usage.cache_read_input_tokens + analysis.usage.cache_creation_input_tokens} in / {analysis.usage.output_tokens} out
                    {analysis.usage.cache_read_input_tokens > 0 && ' · cache hit'}
                  </span>
                </div>
                <AnalysisProse text={analysis.analysis} />

                <div className="mt-4 pt-3 border-t border-gray-200">
                  <div className="flex items-baseline justify-between gap-3 mb-1">
                    <span className="text-xs uppercase tracking-wide text-gray-500">Visual descriptor (image-gen prompt)</span>
                    {analysis.visualDescriptor && editedVisualDescriptor !== analysis.visualDescriptor && (
                      <button
                        type="button"
                        onClick={() => setEditedVisualDescriptor(analysis.visualDescriptor)}
                        className="text-[10px] text-gray-500 hover:text-gray-800 underline"
                      >
                        revert
                      </button>
                    )}
                  </div>
                  <textarea
                    rows={4}
                    value={editedVisualDescriptor}
                    onChange={e => setEditedVisualDescriptor(e.target.value)}
                    placeholder="A 100-word visual descriptor will appear here after research…"
                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm leading-relaxed"
                  />
                </div>

                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-xs uppercase tracking-wide text-gray-500">Chaos</span>
                    <span className="text-xs tabular-nums text-gray-700">{chaos}</span>
                  </div>
                  <input
                    type="range" min={0} max={100} step={1}
                    value={chaos}
                    onChange={e => setChaos(Number(e.target.value))}
                    className="w-full accent-[#7B0000]"
                  />
                  <p className="mt-1 text-[11px] text-gray-500">
                    {chaos === 0 && 'Faithful to the descriptor.'}
                    {chaos > 0 && chaos < 25 && 'Faithful to the descriptor.'}
                    {chaos >= 25 && chaos < 50 && 'Subtle compositional choices: light variation in line weight, slightly off-axis composition.'}
                    {chaos >= 50 && chaos < 75 && 'Compositional risks: noticeable line-weight variation, looser symmetry, an unexpected accent element.'}
                    {chaos >= 75 && 'Deliberate rule-breaking: unconventional proportions, abstracted forms, experimental linework.'}
                  </p>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs uppercase tracking-wide text-gray-500">Flash designs</span>
                    <select
                      value={imageCount}
                      onChange={e => setImageCount(Number(e.target.value))}
                      className="text-xs rounded border border-gray-300 px-2 py-1 bg-white"
                      disabled={generatingImages}
                    >
                      {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <select
                      value={imageModel}
                      onChange={e => setImageModel(e.target.value as ImageModelId)}
                      className="text-xs rounded border border-gray-300 px-2 py-1 bg-white"
                      disabled={generatingImages}
                    >
                      {IMAGE_MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                    </select>
                    <button
                      type="button"
                      onClick={handleGenerateImages}
                      disabled={generatingImages}
                      className="rounded bg-[#7B0000] text-white text-xs px-3 py-1.5 hover:opacity-90 disabled:opacity-50"
                    >
                      {generatingImages ? 'Generating…' : 'Generate flash designs'}
                    </button>
                    <span className="text-[10px] text-gray-500">
                      {IMAGE_MODELS.find(m => m.id === imageModel)?.priceHint}
                    </span>
                  </div>
                  {imageError && <p className="mt-2 text-xs text-red-600">{imageError}</p>}
                  {analysis.images.length > 0 && (
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {analysis.images.map(img => (
                        <a key={img.url} href={img.url} target="_blank" rel="noopener noreferrer" className="block rounded overflow-hidden border border-gray-200 hover:border-gray-400">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img.url} alt="Flash design" className="w-full aspect-square object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-500">Pick a base and a blend strand.</p>
        )}
      </div>

      <div className="md:col-span-2">
        <button
          type="button"
          onClick={() => setHistoryOpen(o => !o)}
          className="text-xs text-gray-700 hover:text-gray-900 underline"
        >
          {historyOpen ? '▾' : '▸'} Recent fusion research ({history.length})
        </button>
        {historyOpen && (
          <ul className="mt-2 divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
            {history.length === 0 ? (
              <li className="p-3 text-xs text-gray-500">No fusion research yet — run one above.</li>
            ) : (
              history.slice(0, 25).map(h => {
                const baseStrand = styles.find(s => s.id === h.baseStyleId)
                const blendStrand = styles.find(s => s.id === h.blendStyleId)
                const imgCount = h.images?.length ?? 0
                const isCurrent = analysis?.entryId === h.id
                return (
                  <li
                    key={h.id}
                    onClick={() => reopenHistoryEntry(h)}
                    className={`p-3 cursor-pointer text-sm flex items-start gap-3 transition-colors ${isCurrent ? 'bg-[#7B0000]/5' : 'hover:bg-gray-50'}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 truncate">{h.fusionName}</div>
                      <div className="text-xs text-gray-500 truncate">
                        {(baseStrand?.label ?? h.baseStyleId)} × {(blendStrand?.label ?? h.blendStyleId)}
                        <span className="ml-2">{new Date(h.timestamp).toLocaleString()}</span>
                        <span className="ml-2">· {h.model}</span>
                      </div>
                    </div>
                    {imgCount > 0 ? (
                      <div className="shrink-0 flex -space-x-1.5">
                        {h.images!.slice(0, 3).map(img => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={img.url} src={img.url} alt="" className="w-8 h-8 rounded border border-white object-cover" />
                        ))}
                        {imgCount > 3 && <span className="text-[10px] text-gray-500 self-center ml-1">+{imgCount - 3}</span>}
                      </div>
                    ) : (
                      <span className="shrink-0 text-[10px] uppercase tracking-wide text-gray-400">no images</span>
                    )}
                  </li>
                )
              })
            )}
          </ul>
        )}
      </div>
    </div>
  )
}

function Slider({ label, value, setValue, hint }: { label: string; value: number; setValue: (v: number) => void; hint?: string }) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between">
        <span className="text-xs uppercase tracking-wide text-gray-500">{label}</span>
        <span className="text-xs text-gray-700 tabular-nums">{hint ?? value}</span>
      </div>
      <input
        type="range" min={0} max={100} step={1}
        value={value}
        onChange={e => setValue(Number(e.target.value))}
        className="w-full mt-1 accent-[#7B0000]"
      />
    </label>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-gray-200 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-sm font-semibold text-gray-900">{value}</div>
    </div>
  )
}

/**
 * Minimal Markdown rendering: split on blank lines for paragraphs, replace
 * `**bold**` and `*italic*` inline. Avoids pulling in a Markdown dep.
 */
function AnalysisProse({ text }: { text: string }) {
  const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
  return (
    <div className="space-y-2 text-sm text-gray-800 leading-relaxed">
      {paragraphs.map((p, i) => (
        <p key={i} dangerouslySetInnerHTML={{ __html: renderInline(p) }} />
      ))}
    </div>
  )
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderInline(s: string): string {
  // Escape first to neutralize any HTML in the model output, then apply
  // the safe inline formatters using their escaped forms.
  let safe = escapeHtml(s)
  safe = safe.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  safe = safe.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
  return safe
}
