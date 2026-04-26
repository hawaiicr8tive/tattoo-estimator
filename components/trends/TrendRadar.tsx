'use client'

import type { TrendForecast } from '@/lib/trends/types'

interface Props {
  forecasts: TrendForecast[]
  onPick?: (id: string) => void
  highlightId?: string | null
}

const TRAJ_BADGE: Record<TrendForecast['trajectory'], { label: string; cls: string }> = {
  rising: { label: 'Rising', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  cresting: { label: 'Cresting', cls: 'bg-amber-100 text-amber-900 border-amber-200' },
  declining: { label: 'Declining', cls: 'bg-rose-100 text-rose-800 border-rose-200' },
  dormant: { label: 'Dormant', cls: 'bg-slate-100 text-slate-700 border-slate-200' },
}

export default function TrendRadar({ forecasts, onPick, highlightId }: Props) {
  return (
    <ul className="divide-y divide-gray-100">
      {forecasts.map(f => {
        const badge = TRAJ_BADGE[f.trajectory]
        const isHi = highlightId === f.styleId
        return (
          <li
            key={f.styleId}
            onClick={() => onPick?.(f.styleId)}
            className={`py-3 px-3 cursor-pointer transition-colors ${isHi ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
          >
            <div className="flex items-baseline justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{f.label}</span>
                  <span className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded border ${badge.cls}`}>
                    {badge.label}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mt-0.5">{f.headline}</p>
                <p className="text-xs text-gray-500 mt-0.5">{f.rationale}</p>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-xl font-bold tabular-nums text-gray-900">{f.momentum}</div>
                <div className="text-[10px] uppercase tracking-wide text-gray-500">momentum</div>
                {f.cycle && (
                  <div className="text-[10px] text-gray-500 mt-1">
                    next ~{f.cycle.nextPeakYear} · {f.cycle.confidence}% conf
                  </div>
                )}
              </div>
            </div>
            <div className="mt-2 h-1 w-full rounded bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded"
                style={{
                  width: `${f.momentum}%`,
                  backgroundColor:
                    f.trajectory === 'rising'
                      ? '#059669'
                      : f.trajectory === 'cresting'
                        ? '#d97706'
                        : f.trajectory === 'declining'
                          ? '#e11d48'
                          : '#94a3b8',
                }}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
