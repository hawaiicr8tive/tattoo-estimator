'use client'
import { useBranding } from '@/components/BrandingProvider'
import { hexToRgb } from '@/lib/branding'

interface Props {
  value: boolean | null
  onChange: (isColor: boolean) => void
}

export default function ColorToggle({ value, onChange }: Props) {
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
      <h2 className="text-xl font-bold text-center text-[var(--brand-text)]">Color or Black &amp; Grey?</h2>
      <div className="flex gap-3">
        <button
          type="button"
          onPointerDown={() => onChange(false)}
          style={value === false ? selectedStyle : defaultStyle}
          className={`flex-1 flex flex-col items-center justify-center rounded-lg border-2 py-6 transition-all cursor-pointer
            ${value === false
              ? ''
              : 'border-[var(--brand-border)] hover:border-[var(--brand-hover-50)]'
            }`}
        >
          <span className="text-3xl mb-2">⬛</span>
          <span className="font-bold">Black &amp; Grey</span>
        </button>
        <button
          type="button"
          onPointerDown={() => onChange(true)}
          style={value === true ? selectedStyle : defaultStyle}
          className={`flex-1 flex flex-col items-center justify-center rounded-lg border-2 py-6 transition-all cursor-pointer
            ${value === true
              ? ''
              : 'border-[var(--brand-border)] hover:border-[var(--brand-hover-50)]'
            }`}
        >
          <span className="text-3xl mb-2">🎨</span>
          <span className="font-bold">Color / Full Color</span>
        </button>
      </div>
      <p className="text-center text-xs text-[var(--brand-text-mid)]">Color work typically adds 20–25% to session time.</p>
    </div>
  )
}
