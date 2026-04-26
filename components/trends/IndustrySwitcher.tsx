'use client'

import type { Industry } from '@/lib/trends/types'

interface Props {
  industries: Industry[]
  current: string
  onChange: (id: string) => void
}

export default function IndustrySwitcher({ industries, current, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {industries.map(ind => {
        const active = ind.id === current
        const isScaffold = ind.status === 'scaffold'
        return (
          <button
            key={ind.id}
            type="button"
            onClick={() => onChange(ind.id)}
            className={`rounded-full text-xs px-3 py-1.5 border transition-colors ${
              active
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
            title={ind.blurb}
          >
            {ind.label}
            {isScaffold && <span className={`ml-1 text-[9px] uppercase ${active ? 'text-gray-300' : 'text-gray-400'}`}>scaffold</span>}
          </button>
        )
      })}
    </div>
  )
}
