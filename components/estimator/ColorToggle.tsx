'use client'

interface Props {
  value: boolean | null
  onChange: (isColor: boolean) => void
}

export default function ColorToggle({ value, onChange }: Props) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-center text-[var(--brand-text)]">Color or Black &amp; Grey?</h2>
      <div className="flex gap-3">
        <button
          type="button"
          onPointerDown={() => onChange(false)}
          className={`flex-1 flex flex-col items-center justify-center rounded-lg border-2 py-6 transition-all cursor-pointer
            ${value === false
              ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-5)]'
              : 'border-gray-200 bg-white hover:border-[var(--brand-primary-50)]'
            }`}
        >
          <span className="text-3xl mb-2">⬛</span>
          <span className="font-bold text-[var(--brand-text)]">Black &amp; Grey</span>
        </button>
        <button
          type="button"
          onPointerDown={() => onChange(true)}
          className={`flex-1 flex flex-col items-center justify-center rounded-lg border-2 py-6 transition-all cursor-pointer
            ${value === true
              ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-5)]'
              : 'border-gray-200 bg-white hover:border-[var(--brand-primary-50)]'
            }`}
        >
          <span className="text-3xl mb-2">🎨</span>
          <span className="font-bold text-[var(--brand-text)]">Color / Full Color</span>
        </button>
      </div>
      <p className="text-center text-xs text-[var(--brand-text-mid)]">Color work typically adds 20–25% to session time.</p>
    </div>
  )
}
