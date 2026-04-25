'use client'
import { useBranding } from '@/components/BrandingProvider'
import { hexToRgb } from '@/lib/branding'
import type { StyleOption } from '@/lib/types'

const DEFAULTS: StyleOption[] = [
  { id: 'fine-line',   label: 'Fine Line / Dotwork',           description: 'Delicate lines, intricate detail, minimal shading',     multiplier: 1.00 },
  { id: 'traditional', label: 'Traditional / Neo-Traditional',  description: 'Bold outlines, classic imagery, rich color fills',      multiplier: 1.00 },
  { id: 'realism',     label: 'Realism & Portraits',            description: 'Photo-realistic detail, portraits, nature scenes',      multiplier: 1.30 },
  { id: 'polynesian',  label: 'Polynesian / Tribal',            description: 'Dense patterns, cultural motifs, high ink coverage',    multiplier: 1.15 },
  { id: 'geometric',   label: 'Geometric',                      description: 'Precise shapes, sacred geometry, ruler-straight lines', multiplier: 1.10 },
]

interface Props {
  value: string | null
  onChange: (style: string) => void
  styles?: StyleOption[]
}

export default function StyleSelector({ value, onChange, styles = DEFAULTS }: Props) {
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
      <h2 className="text-xl font-bold text-center text-[var(--brand-text)]">What style are you looking for?</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {styles.map(style => (
          <button
            key={style.id}
            type="button"
            onPointerDown={() => onChange(style.id)}
            style={value === style.id ? selectedStyle : defaultStyle}
            className={`relative flex flex-col items-center justify-center rounded-lg border-2 p-4 text-center transition-all min-h-[100px] cursor-pointer
              ${value === style.id
                ? 'shadow-md'
                : 'border-[var(--brand-border)] hover:border-[var(--brand-hover-50)]'
              }`}
          >
            {value === style.id && (
              <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--brand-primary)] text-white text-xs">✓</span>
            )}
            <span className="font-semibold text-sm">{style.label}</span>
            <span className="mt-1 text-xs text-[var(--brand-text-mid)]">{style.description}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
