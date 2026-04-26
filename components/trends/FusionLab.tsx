'use client'

import { useMemo, useState } from 'react'
import type { FusionInput, FusionResult, StyleStrand } from '@/lib/trends/types'
import { fuseStyles } from '@/lib/trends/engine'

interface Props {
  styles: StyleStrand[]
  currentYear: number
}

export default function FusionLab({ styles, currentYear }: Props) {
  const [baseId, setBaseId] = useState(styles[0]?.id ?? '')
  const [blendId, setBlendId] = useState(styles[1]?.id ?? styles[0]?.id ?? '')
  const [blendWeight, setBlendWeight] = useState(45)
  const [socialAccelerant, setSocialAccelerant] = useState(70)
  const [anomaly, setAnomaly] = useState(40)
  const [extraSignal, setExtraSignal] = useState('')
  const [extraSignals, setExtraSignals] = useState<string[]>([])

  const base = styles.find(s => s.id === baseId)
  const blend = styles.find(s => s.id === blendId)

  const result: FusionResult | null = useMemo(() => {
    if (!base || !blend) return null
    const input: FusionInput = { baseStyleId: base.id, blendStyleId: blend.id, blendWeight, socialAccelerant, anomaly, extraSignals }
    return fuseStyles(base, blend, input, currentYear)
  }, [base, blend, blendWeight, socialAccelerant, anomaly, extraSignals, currentYear])

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
