'use client'

import { useMemo, useState } from 'react'
import IndustrySwitcher from './IndustrySwitcher'
import TimelineChart from './TimelineChart'
import TrendRadar from './TrendRadar'
import StrandMap from './StrandMap'
import FusionLab from './FusionLab'
import type { IndustryDataset } from '@/lib/trends/types'
import { forecastDataset } from '@/lib/trends/engine'

interface Props {
  datasets: IndustryDataset[]
  defaultIndustry: string
  currentYear: number
}

export default function Dashboard({ datasets, defaultIndustry, currentYear }: Props) {
  const [industryId, setIndustryId] = useState(defaultIndustry)
  const dataset = datasets.find(d => d.industry.id === industryId) ?? datasets[0]
  const [highlightId, setHighlightId] = useState<string | null>(null)

  const forecasts = useMemo(() => forecastDataset(dataset, currentYear), [dataset, currentYear])
  const activeIndustries = datasets.map(d => d.industry)

  const hasData = dataset.styles.length > 0
  const cresting = forecasts.filter(f => f.trajectory === 'cresting')
  const rising = forecasts.filter(f => f.trajectory === 'rising')
  const dueForReturn = forecasts.filter(
    f => f.trajectory === 'dormant' && f.cycle && f.cycle.yearsToNextPeak > 0 && f.cycle.yearsToNextPeak <= 12,
  )

  function pick(id: string) {
    setHighlightId(prev => (prev === id ? null : id))
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500">Trend Intelligence</p>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900">Style Cycle Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1 max-w-2xl">{dataset.industry.blurb}</p>
        </div>
        <IndustrySwitcher industries={activeIndustries} current={industryId} onChange={setIndustryId} />
      </header>

      {!hasData ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <p className="text-sm text-gray-700">
            <strong>{dataset.industry.label}</strong> dataset is a scaffold — drop strands into{' '}
            <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">lib/trends/data.ts</code> to activate.
          </p>
        </div>
      ) : (
        <>
          <SummaryStrip
            cresting={cresting.length}
            rising={rising.length}
            dueForReturn={dueForReturn.length}
            currentYear={currentYear}
          />

          <section className="rounded-2xl border border-gray-200 bg-white p-4 md:p-5">
            <div className="flex items-baseline justify-between gap-3 mb-3">
              <h2 className="text-lg font-bold text-gray-900">Popularity over time</h2>
              {highlightId && (
                <button onClick={() => setHighlightId(null)} className="text-xs text-gray-500 hover:text-gray-800">clear filter</button>
              )}
            </div>
            <TimelineChart
              styles={dataset.styles}
              yearStart={dataset.yearRange.start}
              yearEnd={dataset.yearRange.end}
              currentYear={currentYear}
              highlightId={highlightId}
              onPick={pick}
            />
          </section>

          <div className="grid lg:grid-cols-3 gap-5">
            <section className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-4 md:p-5">
              <h2 className="text-lg font-bold text-gray-900 mb-1">What&apos;s around the corner</h2>
              <p className="text-xs text-gray-500 mb-3">Forecast for {currentYear} → {currentYear + 5}</p>
              <TrendRadar forecasts={forecasts} highlightId={highlightId} onPick={pick} />
            </section>
            <section className="rounded-2xl border border-gray-200 bg-white p-4 md:p-5">
              <h2 className="text-lg font-bold text-gray-900 mb-2">Cycle notes</h2>
              <ul className="space-y-2 text-sm text-gray-700">
                {dataset.cycleNotes.map((n, i) => <li key={i}>· {n}</li>)}
              </ul>
              <div className="mt-4">
                <h3 className="text-xs uppercase tracking-wide text-gray-500 mb-1">Due for a return (cycle math)</h3>
                {dueForReturn.length === 0 ? (
                  <p className="text-sm text-gray-500">No dormant strands inside the next 12-year window.</p>
                ) : (
                  <ul className="text-sm text-gray-800 space-y-1">
                    {dueForReturn.map(f => (
                      <li key={f.styleId}>
                        <span className="font-medium">{f.label}</span> — projected {f.cycle?.nextPeakYear}
                        {f.cycle ? ` (${f.cycle.confidence}% conf)` : ''}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>

          <section className="rounded-2xl border border-gray-200 bg-white p-4 md:p-5">
            <div className="flex items-baseline justify-between gap-3 mb-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Lineage map</h2>
                <p className="text-xs text-gray-500">How strands descend from each other. Click a node to filter the chart and radar.</p>
              </div>
            </div>
            <StrandMap styles={dataset.styles} highlightId={highlightId} onPick={pick} />
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-4 md:p-5">
            <div className="mb-3">
              <h2 className="text-lg font-bold text-gray-900">Fusion Lab</h2>
              <p className="text-xs text-gray-500">
                Blend two strands and tune the social-media accelerant and anomaly sliders to forecast a style that isn&apos;t on the radar yet.
              </p>
            </div>
            <FusionLab styles={dataset.styles} currentYear={currentYear} />
          </section>
        </>
      )}
    </div>
  )
}

function SummaryStrip({ cresting, rising, dueForReturn, currentYear }: { cresting: number; rising: number; dueForReturn: number; currentYear: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card label="Cresting now" value={cresting.toString()} sub={`${currentYear} leaders`} tone="amber" />
      <Card label="Rising" value={rising.toString()} sub="momentum gaining" tone="emerald" />
      <Card label="Due for return" value={dueForReturn.toString()} sub="dormant cycle hits" tone="slate" />
      <Card label="Cycle assumption" value="22 yr" sub="compresses ~55% online" tone="rose" />
    </div>
  )
}

function Card({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: 'amber' | 'emerald' | 'slate' | 'rose' }) {
  const tones = {
    amber: 'border-amber-200 bg-amber-50',
    emerald: 'border-emerald-200 bg-emerald-50',
    slate: 'border-slate-200 bg-slate-50',
    rose: 'border-rose-200 bg-rose-50',
  } as const
  return (
    <div className={`rounded-xl border ${tones[tone]} px-3 py-2.5`}>
      <div className="text-[10px] uppercase tracking-wide text-gray-600">{label}</div>
      <div className="text-2xl font-bold tabular-nums text-gray-900">{value}</div>
      <div className="text-xs text-gray-600">{sub}</div>
    </div>
  )
}
