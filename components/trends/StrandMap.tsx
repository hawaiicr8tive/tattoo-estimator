'use client'

import { useMemo } from 'react'
import type { StyleStrand } from '@/lib/trends/types'

interface Props {
  styles: StyleStrand[]
  highlightId?: string | null
  onPick?: (id: string) => void
}

/**
 * Lightweight strand map: groups styles by origin decade columns and draws ancestor lines.
 */
export default function StrandMap({ styles, highlightId, onPick }: Props) {
  const cols = useMemo(() => {
    const buckets = new Map<number, StyleStrand[]>()
    for (const s of styles) {
      const decade = Math.floor(s.origin / 10) * 10
      const key = Math.max(decade, 1900)
      if (!buckets.has(key)) buckets.set(key, [])
      buckets.get(key)!.push(s)
    }
    return Array.from(buckets.entries()).sort((a, b) => a[0] - b[0])
  }, [styles])

  const positions = useMemo(() => {
    const pos = new Map<string, { x: number; y: number }>()
    const colW = 200
    const rowH = 56
    cols.forEach(([, items], colIdx) => {
      items.forEach((s, rowIdx) => {
        pos.set(s.id, { x: colIdx * colW + 12, y: rowIdx * rowH + 32 })
      })
    })
    return pos
  }, [cols])

  const width = Math.max(720, cols.length * 200 + 16)
  const maxRows = Math.max(1, ...cols.map(([, items]) => items.length))
  const height = maxRows * 56 + 56

  function relatedToHi(id: string): boolean {
    if (!highlightId) return false
    if (id === highlightId) return true
    const me = styles.find(s => s.id === id)
    const hi = styles.find(s => s.id === highlightId)
    if (!me || !hi) return false
    if (me.ancestors.includes(highlightId) || hi.ancestors.includes(id)) return true
    if (me.parentId === highlightId || hi.parentId === id) return true
    return false
  }

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ minWidth: width }}>
        {cols.map(([decade], i) => (
          <g key={decade}>
            <text x={i * 200 + 12} y={18} fontSize={11} fill="#6b7280" fontWeight={600}>
              {decade}s
            </text>
            <line x1={i * 200 + 12} y1={22} x2={i * 200 + 188} y2={22} stroke="#e5e7eb" />
          </g>
        ))}

        {styles.map(s =>
          s.ancestors.map(aid => {
            const a = positions.get(aid)
            const b = positions.get(s.id)
            if (!a || !b) return null
            const dim = highlightId && !relatedToHi(s.id) && !relatedToHi(aid)
            return (
              <line
                key={`anc:${aid}->${s.id}`}
                x1={a.x + 170} y1={a.y + 14}
                x2={b.x} y2={b.y + 14}
                stroke="#cbd5e1"
                strokeWidth={1}
                strokeDasharray="3 3"
                opacity={dim ? 0.1 : 0.6}
              />
            )
          }),
        )}

        {styles.map(s => {
          if (!s.parentId) return null
          const a = positions.get(s.parentId)
          const b = positions.get(s.id)
          if (!a || !b) return null
          const dim = highlightId && !relatedToHi(s.id) && !relatedToHi(s.parentId)
          return (
            <line
              key={`par:${s.parentId}->${s.id}`}
              x1={a.x + 170} y1={a.y + 14}
              x2={b.x} y2={b.y + 14}
              stroke="#7B0000"
              strokeWidth={1.5}
              opacity={dim ? 0.2 : 0.85}
            />
          )
        })}

        {styles.map(s => {
          const p = positions.get(s.id)
          if (!p) return null
          const isHi = highlightId === s.id
          const dim = highlightId && !relatedToHi(s.id)
          return (
            <g
              key={s.id}
              transform={`translate(${p.x},${p.y})`}
              opacity={dim ? 0.25 : 1}
              onClick={() => onPick?.(s.id)}
              style={{ cursor: onPick ? 'pointer' : 'default' }}
            >
              <rect
                width={170} height={28} rx={6}
                fill={isHi ? '#7B0000' : '#ffffff'}
                stroke={isHi ? '#7B0000' : '#cbd5e1'}
              />
              <text x={8} y={18} fontSize={11} fill={isHi ? '#ffffff' : '#0f172a'} fontWeight={600}>
                {s.label}
              </text>
            </g>
          )
        })}
      </svg>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-600">
        <span className="inline-flex items-center gap-1.5">
          <svg width="20" height="6"><line x1="0" y1="3" x2="20" y2="3" stroke="#7B0000" strokeWidth="1.5" /></svg>
          parent / sub-style
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="20" height="6"><line x1="0" y1="3" x2="20" y2="3" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" /></svg>
          ancestral lineage
        </span>
      </div>
    </div>
  )
}
