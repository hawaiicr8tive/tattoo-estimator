'use client'

import { useMemo } from 'react'
import type { StyleStrand } from '@/lib/trends/types'
import { densifyCurve, detectPeaks } from '@/lib/trends/engine'

interface Props {
  styles: StyleStrand[]
  yearStart: number
  yearEnd: number
  highlightId?: string | null
  currentYear: number
  onPick?: (id: string) => void
}

const PALETTE = [
  '#7B0000', '#0E7C66', '#1F4FA0', '#B6671B', '#5B2A86',
  '#0F766E', '#9D174D', '#1E3A8A', '#92400E', '#065F46',
  '#7C2D12', '#3730A3', '#155E75', '#831843', '#365314',
  '#9F1239', '#0C4A6E', '#14532D',
]

export default function TimelineChart({ styles, yearStart, yearEnd, highlightId, currentYear, onPick }: Props) {
  const width = 880
  const height = 320
  const padL = 44
  const padR = 16
  const padT = 16
  const padB = 28

  const innerW = width - padL - padR
  const innerH = height - padT - padB

  const series = useMemo(() => {
    return styles.map((s, i) => {
      const dense = densifyCurve(s.curve, yearStart, yearEnd)
      const peaks = detectPeaks(s.curve)
      const color = PALETTE[i % PALETTE.length]
      return { style: s, dense, peaks, color }
    })
  }, [styles, yearStart, yearEnd])

  const xFor = (year: number) => padL + ((year - yearStart) / (yearEnd - yearStart)) * innerW
  const yFor = (val: number) => padT + innerH - (val / 100) * innerH

  const xTicks: number[] = []
  for (let y = Math.ceil(yearStart / 10) * 10; y <= yearEnd; y += 10) xTicks.push(y)

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[680px] h-[320px]">
        {/* gridlines */}
        {[0, 25, 50, 75, 100].map(v => (
          <g key={v}>
            <line x1={padL} y1={yFor(v)} x2={width - padR} y2={yFor(v)} stroke="#e5e7eb" strokeWidth={1} />
            <text x={padL - 6} y={yFor(v) + 3} fontSize={10} textAnchor="end" fill="#6b7280">{v}</text>
          </g>
        ))}
        {xTicks.map(t => (
          <g key={t}>
            <line x1={xFor(t)} y1={padT} x2={xFor(t)} y2={height - padB} stroke="#f3f4f6" strokeWidth={1} />
            <text x={xFor(t)} y={height - padB + 14} fontSize={10} textAnchor="middle" fill="#6b7280">{t}</text>
          </g>
        ))}

        {/* current year marker */}
        <line
          x1={xFor(currentYear)} y1={padT}
          x2={xFor(currentYear)} y2={height - padB}
          stroke="#111827" strokeDasharray="4 4" strokeWidth={1}
        />
        <text x={xFor(currentYear) + 4} y={padT + 10} fontSize={10} fill="#111827">now</text>

        {/* curves */}
        {series.map(s => {
          const dim = highlightId && highlightId !== s.style.id
          const path = s.dense
            .map((p, i) => `${i === 0 ? 'M' : 'L'}${xFor(p.year).toFixed(1)},${yFor(p.value).toFixed(1)}`)
            .join(' ')
          return (
            <g key={s.style.id} opacity={dim ? 0.15 : 1}>
              <path
                d={path}
                fill="none"
                stroke={s.color}
                strokeWidth={highlightId === s.style.id ? 3 : 1.6}
                onClick={() => onPick?.(s.style.id)}
                style={{ cursor: onPick ? 'pointer' : 'default' }}
              />
              {s.peaks.map(py => (
                <circle key={py} cx={xFor(py)} cy={yFor(s.dense.find(d => d.year === py)?.value ?? 0)} r={3} fill={s.color} />
              ))}
            </g>
          )
        })}
      </svg>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs">
        {series.map(s => {
          const dim = highlightId && highlightId !== s.style.id
          return (
            <button
              type="button"
              key={s.style.id}
              onClick={() => onPick?.(s.style.id)}
              className={`flex items-center gap-1.5 ${dim ? 'opacity-40' : ''} hover:opacity-100`}
            >
              <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: s.color }} />
              <span className="text-gray-700">{s.style.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
