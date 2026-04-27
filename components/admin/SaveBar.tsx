'use client'

interface Props {
  title: string
  saving: boolean
  saved: boolean
  error: string | null
  onSave: () => void
}

export default function SaveBar({ title, saving, saved, error, onSave }: Props) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-lg font-bold text-[var(--brand-text)]">{title}</h2>
      <div className="flex items-center gap-3">
        {saved && <span className="text-sm text-green-600 font-medium">✓ Saved</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="rounded-lg bg-[#7B0000] px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60 cursor-pointer"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
