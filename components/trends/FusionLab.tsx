'use client'

import { useMemo, useState } from 'react'
import type { FusionInput, FusionResult, StyleStrand } from '@/lib/trends/types'
import { fuseStyles } from '@/lib/trends/engine'

const RESEARCH_MODELS = [
  { id: 'claude-opus-4-7', label: 'Opus 4.7' },
  { id: 'claude-sonnet-4-6', label: 'Sonnet 4.6' },
  { id: 'claude-haiku-4-5', label: 'Haiku 4.5' },
] as const
type ResearchModelId = (typeof RESEARCH_MODELS)[number]['id']

interface Props {
  styles: StyleStrand[]
  currentYear: number
  industryId: string
}

interface AnalysisState {
  analysis: string
  model: string
  fusionName: string
  baseLabel: string
  blendLabel: string
  usage: { input_tokens: number; output_tokens: number; cache_read_input_tokens: number; cache_creation_input_tokens: number }
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

  const base = styles.find(s => s.id === baseId)
  const blend = styles.find(s => s.id === blendId)

  const result: FusionResult | null = useMemo(() => {
    if (!base || !blend) return null
    const input: FusionInput = { baseStyleId: base.id, blendStyleId: blend.id, blendWeight, socialAccelerant, anomaly, extraSignals }
    return fuseStyles(base, blend, input, currentYear)
  }, [base, blend, blendWeight, socialAccelerant, anomaly, extraSignals, currentYear])

  async function handleResearch() {
    if (!base || !blend || !result) return
    setResearching(true)
    setResearchError(null)
    setAnalysis(null)
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
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Research failed')
      setAnalysis({
        analysis: data.entry.analysis,
        model: data.entry.model,
        fusionName: data.entry.fusionName,
        baseLabel: base.label,
        blendLabel: blend.label,
        usage: data.entry.usage,
      })
    } catch (e) {
      setResearchError(e instanceof Error ? e.message : 'Research failed')
    } finally {
      setResearching(false)
    }
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
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-500">Pick a base and a blend strand.</p>
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
