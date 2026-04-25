'use client'
import { useBranding } from '@/components/BrandingProvider'
import { hexToRgb } from '@/lib/branding'
import type { TattooSize } from '@/lib/types'

const SIZES: { id: TattooSize; label: string; dims: string; analog: string; note?: string }[] = [
  { id: 'tiny',   label: 'TINY',        dims: 'Under 2"', analog: 'Coin-sized' },
  { id: 'small',  label: 'SMALL',       dims: '2 – 4"',   analog: 'Palm-sized' },
  { id: 'medium', label: 'MEDIUM',      dims: '4 – 6"',   analog: 'Hand-sized' },
  { id: 'large',  label: 'LARGE',       dims: '6 – 9"',   analog: 'Forearm-length' },
  { id: 'xl',     label: 'XL / CUSTOM', dims: '9"+',       analog: 'Full sleeve / back piece', note: 'Large pieces are quoted directly — your results will show a consultation range.' },
]

interface Props {
  value: TattooSize | null
  onChange: (size: TattooSize) => void
}

export default function SizeSelector({ value, onChange }: Props) {
  const { cardDefaultBg, cardDefaultOpacity, cardDefaultText, cardSelectedBg, cardSelectedOpacity, cardSelectedText, cardSelectedBorder } = useBranding()
  const selectedStyle: React.CSSProperties = {
    backgroundColor: `rgba(${hexToRgb(cardSelectedBg)}, ${cardSelectedOpacity / 100})`,
    color: cardSelectedText,
    borderColor: cardSelectedBorder,
  }
  const defaultStyle: React.CSSProperties = {
    backgroundColor: `rgba(${hexToRgb(cardDefaultBg)}, ${cardDefaultOpacity / 100})`,
    color: cardDefaultText,
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-center text-[var(--brand-text)]">How big is your tattoo?</h2>
      <div className="space-y-2">
        {SIZES.map(size => (
          <button
            key={size.id}
            type="button"
            onPointerDown={() => onChange(size.id)}
            style={value === size.id ? selectedStyle : defaultStyle}
            className={`w-full flex items-center justify-between rounded-lg border-2 px-4 py-3 text-left transition-all cursor-pointer
              ${value === size.id
                ? ''
                : 'border-[var(--brand-border)] hover:border-[var(--brand-hover-50)]'
              }`}
          >
            <div>
              <span className="font-bold">{size.label}</span>
              <span className="ml-2 text-sm text-[var(--brand-text-mid)]">{size.dims}</span>
              {size.note && (
                <p className="mt-1 text-xs text-[var(--brand-primary)]">{size.note}</p>
              )}
            </div>
            <span className="text-sm text-[var(--brand-text-mid)] shrink-0 ml-4">{size.analog}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
