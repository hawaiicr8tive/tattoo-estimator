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
      <h2 className="text-xl font-bold text-center text-[#0A0A0A]">Anything else we should know?</h2>
      <p className="text-center text-sm text-[#555555]">This step is optional — feel free to skip.</p>
      <div className="relative">
        <textarea
          value={value}
          onChange={e => onChange(e.target.value.slice(0, MAX))}
          rows={5}
          placeholder="Anything else we should know? Cover-up? Reference image? Rough design idea?"
          className="w-full rounded-lg border border-gray-300 p-3 text-sm text-[#0A0A0A] resize-none focus:outline-none focus:ring-2 focus:ring-[#7B0000] focus:border-transparent"
        />
        <span className={`absolute bottom-3 right-3 text-xs ${value.length >= MAX ? 'text-[#7B0000]' : 'text-[#555555]'}`}>
          {value.length}/{MAX}
        </span>
      </div>
      <button
        type="button"
        onClick={onSkip}
        className="block mx-auto text-sm text-[#555555] underline hover:text-[#0A0A0A] cursor-pointer"
      >
        Skip this step
      </button>
    </div>
  )
}
