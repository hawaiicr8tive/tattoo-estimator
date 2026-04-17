'use client'
import type { TattooSize } from '@/lib/types'

const SIZES: { id: TattooSize; label: string; dims: string; analog: string; note?: string }[] = [
  { id: 'tiny',   label: 'TINY',      dims: 'Under 2"',  analog: 'Coin-sized' },
  { id: 'small',  label: 'SMALL',     dims: '2 – 4"',    analog: 'Palm-sized' },
  { id: 'medium', label: 'MEDIUM',    dims: '4 – 6"',    analog: 'Hand-sized' },
  { id: 'large',  label: 'LARGE',     dims: '6 – 9"',    analog: 'Forearm-length' },
  { id: 'xl',     label: 'XL / CUSTOM', dims: '9"+',      analog: 'Full sleeve / back piece', note: 'Large pieces are quoted directly — your results will show a consultation range.' },
]

interface Props {
  value: TattooSize | null
  onChange: (size: TattooSize) => void
}

export default function SizeSelector({ value, onChange }: Props) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-center text-[#0A0A0A]">How big is your tattoo?</h2>
      <div className="space-y-2">
        {SIZES.map(size => (
          <button
            key={size.id}
            type="button"
            onPointerDown={() => onChange(size.id)}
            className={`w-full flex items-center justify-between rounded-lg border-2 px-4 py-3 text-left transition-all cursor-pointer
              ${value === size.id
                ? 'border-[#7B0000] bg-[#7B0000]/5'
                : 'border-gray-200 bg-white hover:border-[#7B0000]/50'
              }`}
          >
            <div>
              <span className="font-bold text-[#0A0A0A]">{size.label}</span>
              <span className="ml-2 text-sm text-[#555555]">{size.dims}</span>
              {size.note && (
                <p className="mt-1 text-xs text-[#7B0000]">{size.note}</p>
              )}
            </div>
            <span className="text-sm text-[#555555] shrink-0 ml-4">{size.analog}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
