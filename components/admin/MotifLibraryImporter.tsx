'use client'

import { useState } from 'react'

const SAMPLE_CSV = `category,name,industries,aliases,description
Plants & Botanical,Banyan Tree,"hawaii-souvenir,tattoo",fig tree,Aerial-rooted tropical tree
Tribal Frames,Geometric Border,*,,Repeating angular frame motif`

interface ImportResult {
  ok: boolean
  message: string
  errors?: string[]
}

export default function MotifLibraryImporter() {
  const [csv, setCsv] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  async function handleFile(file: File) {
    const text = await file.text()
    setCsv(text)
    setResult(null)
  }

  async function submit() {
    if (!csv.trim()) return
    setBusy(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/motif-library/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv }),
      })
      const data = await res.json()
      if (!res.ok) {
        setResult({
          ok: false,
          message: data.error ?? 'Import failed',
          errors: Array.isArray(data.errors) ? data.errors : undefined,
        })
      } else {
        setResult({
          ok: true,
          message: `Added ${data.addedItems} item${data.addedItems === 1 ? '' : 's'}, ${data.addedCategories} new categor${data.addedCategories === 1 ? 'y' : 'ies'}.`,
          errors: Array.isArray(data.parseErrors) && data.parseErrors.length > 0 ? data.parseErrors : undefined,
        })
        setCsv('')
      }
    } catch (e) {
      setResult({ ok: false, message: e instanceof Error ? e.message : 'Network error' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-xl border border-[var(--brand-border)] bg-[var(--brand-card)] p-4 sm:p-5 space-y-4">
      <div>
        <h2 className="text-base sm:text-lg font-bold text-[var(--brand-text)]">Motif Library</h2>
        <p className="text-xs sm:text-sm text-[var(--brand-text-mid)] mt-1">
          Add new categories or items shown in Fusion Lab&apos;s content-focus picker. Imports merge into the live library — no redeploy.
        </p>
      </div>

      <div className="text-xs text-[var(--brand-text-mid)] space-y-1.5">
        <div>
          <span className="font-semibold text-[var(--brand-text)]">CSV columns:</span>{' '}
          <code className="text-[var(--brand-primary)]">category,name[,industries][,aliases][,description]</code>
        </div>
        <ul className="list-disc list-inside space-y-0.5 ml-1">
          <li><code>category</code> + <code>name</code> are required. New categories auto-created from the label.</li>
          <li><code>industries</code> is comma-separated inside the cell — quote the whole cell: <code>&quot;tattoo,walkin&quot;</code>. Empty = all industries.</li>
          <li>Valid industry ids: <code>tattoo</code>, <code>walkin</code>, <code>fashion</code>, <code>hawaii-souvenir</code>, or <code>*</code>.</li>
          <li><code>aliases</code> same shape as industries; <code>description</code> is a free-text hint for the model.</li>
        </ul>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--brand-border)] text-xs text-[var(--brand-text)] hover:border-[var(--brand-primary)] cursor-pointer">
          <span>Choose CSV file</span>
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0]
              if (f) handleFile(f)
              e.target.value = ''
            }}
          />
        </label>
        <button
          type="button"
          onClick={() => { setCsv(SAMPLE_CSV); setResult(null) }}
          className="text-xs text-[var(--brand-text-mid)] hover:text-[var(--brand-text)] underline cursor-pointer"
        >
          Insert sample
        </button>
        {csv && (
          <button
            type="button"
            onClick={() => { setCsv(''); setResult(null) }}
            className="text-xs text-[var(--brand-text-mid)] hover:text-[var(--brand-text)] underline cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      <textarea
        value={csv}
        onChange={e => { setCsv(e.target.value); setResult(null) }}
        rows={8}
        spellCheck={false}
        placeholder={SAMPLE_CSV}
        className="w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-bg)] px-3 py-2 text-xs font-mono text-[var(--brand-text)] placeholder:text-[var(--brand-text-mid)] focus:outline-none focus:border-[var(--brand-primary)]"
      />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          type="button"
          onClick={submit}
          disabled={busy || !csv.trim()}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-[var(--brand-primary-text)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          style={{ background: 'var(--brand-gradient)', boxShadow: '0 0 18px var(--brand-glow)' }}
        >
          {busy ? 'Importing…' : 'Import to library'}
        </button>
        {result && (
          <span className={`text-xs ${result.ok ? 'text-emerald-400' : 'text-rose-400'}`}>
            {result.message}
          </span>
        )}
      </div>

      {result?.errors && result.errors.length > 0 && (
        <ul className="text-xs text-amber-400 list-disc list-inside space-y-0.5">
          {result.errors.map((err, i) => <li key={i}>{err}</li>)}
        </ul>
      )}
    </section>
  )
}
