'use client'

interface Props {
  value: boolean | null
  onChange: (isColor: boolean) => void
}

export default function ColorToggle({ value, onChange }: Props) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-center text-[#0A0A0A]">Color or Black &amp; Grey?</h2>
      <div className="flex gap-3">
        <button
          type="button"
          onPointerDown={() => onChange(false)}
          className={`flex-1 flex flex-col items-center justify-center rounded-lg border-2 py-6 transition-all cursor-pointer
            ${value === false
              ? 'border-[#7B0000] bg-[#7B0000]/5'
              : 'border-gray-200 bg-white hover:border-[#7B0000]/50'
            }`}
        >
          <span className="text-3xl mb-2">⬛</span>
          <span className="font-bold text-[#0A0A0A]">Black &amp; Grey</span>
        </button>
        <button
          type="button"
          onPointerDown={() => onChange(true)}
          className={`flex-1 flex flex-col items-center justify-center rounded-lg border-2 py-6 transition-all cursor-pointer
            ${value === true
              ? 'border-[#7B0000] bg-[#7B0000]/5'
              : 'border-gray-200 bg-white hover:border-[#7B0000]/50'
            }`}
        >
          <span className="text-3xl mb-2">🎨</span>
          <span className="font-bold text-[#0A0A0A]">Color / Full Color</span>
        </button>
      </div>
      <p className="text-center text-xs text-[#555555]">Color work typically adds 20–25% to session time.</p>
    </div>
  )
}
