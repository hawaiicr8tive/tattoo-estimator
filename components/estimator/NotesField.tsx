'use client'

interface Props {
  value: string
  onChange: (notes: string) => void
  onSkip: () => void
}

const MAX = 300

export default function NotesField({ value, onChange, onSkip }: Props) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-center text-[var(--brand-text)]">Anything else we should know?</h2>
      <p className="text-center text-sm text-[var(--brand-text-mid)]">This step is optional — feel free to skip.</p>
      <div className="relative">
        <textarea
          value={value}
          onChange={e => onChange(e.target.value.slice(0, MAX))}
          rows={5}
          placeholder="Anything else we should know? Cover-up? Reference image? Rough design idea?"
          className="w-full rounded-lg border border-gray-300 p-3 text-sm text-[var(--brand-text)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
        />
        <span className={`absolute bottom-3 right-3 text-xs ${value.length >= MAX ? 'text-[var(--brand-primary)]' : 'text-[var(--brand-text-mid)]'}`}>
          {value.length}/{MAX}
        </span>
      </div>
      <button
        type="button"
        onClick={onSkip}
        className="block mx-auto text-sm text-[var(--brand-text-mid)] underline hover:text-[var(--brand-text)] cursor-pointer"
      >
        Skip this step
      </button>
    </div>
  )
}
