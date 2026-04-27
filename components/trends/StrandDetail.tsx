'use client'

import type { StyleStrand, TrendForecast } from '@/lib/trends/types'

interface Props {
  strand: StyleStrand
  forecast?: TrendForecast
  onClose: () => void
}

const TRAJ_COLORS: Record<TrendForecast['trajectory'], string> = {
  rising: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  cresting: 'bg-amber-100 text-amber-900 border-amber-200',
  declining: 'bg-rose-100 text-rose-800 border-rose-200',
  dormant: 'bg-slate-100 text-slate-700 border-slate-200',
}

const SAT_COLORS: Record<TrendForecast['saturationLabel'], string> = {
  low: 'bg-gray-100 text-gray-700 border-gray-200',
  watch: 'bg-orange-50 text-orange-800 border-orange-200',
  high: 'bg-rose-50 text-rose-800 border-rose-300',
}

const MEDIUM_LABELS: Record<string, string> = {
  film: 'Film',
  tv: 'TV',
  music: 'Music',
  celebrity: 'Celebrity',
  viral: 'Viral',
  literature: 'Literature',
  sports: 'Sports',
  other: 'Other',
}

const IMPACT_DOT: Record<string, string> = {
  high: 'bg-rose-500',
  medium: 'bg-amber-500',
  low: 'bg-slate-400',
}

export default function StrandDetail({ strand, forecast, onClose }: Props) {
  const peaks = strand.curve.slice().sort((a, b) => a.year - b.year)
  const triggers = (strand.triggers ?? []).slice().sort((a, b) => a.year - b.year)

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 md:p-5">
      <header className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold text-gray-900">{strand.label}</h2>
            <code className="text-xs bg-gray-100 rounded px-1.5 py-0.5 text-gray-600">{strand.id}</code>
            {forecast && (
              <>
                <span className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded border ${TRAJ_COLORS[forecast.trajectory]}`}>
                  {forecast.trajectory}
                </span>
                {forecast.saturationLabel !== 'low' && (
                  <span className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded border ${SAT_COLORS[forecast.saturationLabel]}`}>
                    Saturation {forecast.saturationLabel}
                  </span>
                )}
              </>
            )}
          </div>
          {strand.tagline && <p className="text-sm text-gray-700 mt-0.5">{strand.tagline}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 text-xs text-gray-500 hover:text-gray-900 underline"
        >
          close
        </button>
      </header>

      {strand.description && (
        <p className="text-sm text-gray-800 leading-relaxed mb-4">{strand.description}</p>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-xs uppercase tracking-wide text-gray-500 mb-1.5">
            Cultural triggers
            {triggers.length > 0 && <span className="ml-1 text-gray-400">({triggers.length})</span>}
          </h3>
          {triggers.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No cultural triggers attached. Add some in /admin → Trends if you can identify the events that drove this strand.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {triggers.map((t, i) => (
                <li key={`${t.year}-${i}`} className="flex items-start gap-2">
                  <span className="font-medium tabular-nums text-gray-900 shrink-0 w-12">{t.year}</span>
                  <span className={`mt-1.5 inline-block w-2 h-2 rounded-full shrink-0 ${IMPACT_DOT[t.impact] ?? 'bg-gray-400'}`} title={`${t.impact} impact`} />
                  <div className="min-w-0">
                    <span className="text-gray-900">{t.name}</span>
                    <span className="ml-1 text-xs text-gray-500">({MEDIUM_LABELS[t.medium] ?? t.medium})</span>
                    {t.notes && <p className="text-xs text-gray-500 mt-0.5">{t.notes}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3 className="text-xs uppercase tracking-wide text-gray-500 mb-1.5">Popularity over time</h3>
          {peaks.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No curve points yet.</p>
          ) : (
            <div className="space-y-1">
              {peaks.map(p => (
                <div key={p.year} className="flex items-center gap-2 text-sm">
                  <span className="font-medium tabular-nums text-gray-900 shrink-0 w-12">{p.year}</span>
                  <div className="flex-1 h-1.5 rounded bg-gray-100 overflow-hidden">
                    <div className="h-full rounded bg-[#7B0000]" style={{ width: `${p.value}%` }} />
                  </div>
                  <span className="text-xs text-gray-700 tabular-nums w-8 text-right">{p.value}</span>
                </div>
              ))}
            </div>
          )}
          {forecast?.cycle && forecast.cycle.peaks.length >= 2 && (
            <p className="mt-2 text-xs text-gray-600">
              Detected peaks: {forecast.cycle.peaks.join(', ')} · projected next ~{forecast.cycle.nextPeakYear} ({forecast.cycle.confidence}% confidence)
            </p>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mt-4 text-sm">
        {strand.signals.length > 0 && (
          <div>
            <h3 className="text-xs uppercase tracking-wide text-gray-500 mb-1.5">Carrying signals</h3>
            <div className="flex flex-wrap gap-1">
              {strand.signals.map(s => (
                <span key={s} className="text-xs rounded-full bg-blue-50 text-blue-800 px-2 py-0.5">{s}</span>
              ))}
            </div>
          </div>
        )}
        {strand.tags.length > 0 && (
          <div>
            <h3 className="text-xs uppercase tracking-wide text-gray-500 mb-1.5">Tags</h3>
            <div className="flex flex-wrap gap-1">
              {strand.tags.map(t => (
                <span key={t} className="text-xs rounded-full bg-gray-100 text-gray-700 px-2 py-0.5">{t}</span>
              ))}
            </div>
          </div>
        )}
        {(strand.pioneers && strand.pioneers.length > 0) && (
          <div>
            <h3 className="text-xs uppercase tracking-wide text-gray-500 mb-1.5">Pioneers</h3>
            <ul className="text-sm text-gray-800">
              {strand.pioneers.map(p => <li key={p}>· {p}</li>)}
            </ul>
          </div>
        )}
      </div>

      {(strand.parentId || strand.ancestors.length > 0) && (
        <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-600">
          {strand.parentId && <span>Sub-style of <code className="bg-gray-100 rounded px-1">{strand.parentId}</code></span>}
          {strand.parentId && strand.ancestors.length > 0 && <span className="mx-2">·</span>}
          {strand.ancestors.length > 0 && (
            <span>Ancestors: {strand.ancestors.map(a => <code key={a} className="bg-gray-100 rounded px-1 mr-1">{a}</code>)}</span>
          )}
        </div>
      )}
    </section>
  )
}
