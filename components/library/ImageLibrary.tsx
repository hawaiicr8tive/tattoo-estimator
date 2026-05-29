'use client'

import { useEffect, useMemo, useState } from 'react'
import ImageLightbox from '@/components/trends/ImageLightbox'

interface LibraryImage {
  id: string
  url: string
  bucketPath: string
  fusionEntryId: string
  fusionName: string | null
  industryId: string | null
  industryLabel: string | null
  baseStyleId: string | null
  blendStyleId: string | null
  baseLabel: string | null
  blendLabel: string | null
  model: string | null
  chaos: number | null
  prompt: string | null
  createdAt: string
  isOrphan: boolean
}

interface Facets {
  industries: string[]
  models: string[]
  totalCount: number
  orphanCount: number
}

type OrphanFilter = 'include' | 'exclude' | 'only'

const ORPHAN_OPTIONS: { id: OrphanFilter; label: string }[] = [
  { id: 'include', label: 'Include orphans' },
  { id: 'exclude', label: 'Hide orphans' },
  { id: 'only', label: 'Orphans only' },
]

export default function ImageLibrary() {
  const [images, setImages] = useState<LibraryImage[] | null>(null)
  const [facets, setFacets] = useState<Facets | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [industry, setIndustry] = useState<string>('')
  const [model, setModel] = useState<string>('')
  const [chaosMin, setChaosMin] = useState(0)
  const [chaosMax, setChaosMax] = useState(100)
  const [orphanFilter, setOrphanFilter] = useState<OrphanFilter>('include')
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/research/fusion/library')
      .then(r => r.json().then(d => ({ ok: r.ok, data: d })))
      .then(({ ok, data }) => {
        if (cancelled) return
        if (!ok) {
          setError(data?.error ?? 'Failed to load library')
          return
        }
        setImages(data.images)
        setFacets(data.facets)
      })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'Network error') })
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    if (!images) return []
    const q = search.trim().toLowerCase()
    return images.filter(img => {
      if (orphanFilter === 'exclude' && img.isOrphan) return false
      if (orphanFilter === 'only' && !img.isOrphan) return false
      if (industry && img.industryId !== industry) return false
      if (model && img.model !== model) return false
      if (img.chaos !== null && (img.chaos < chaosMin || img.chaos > chaosMax)) return false
      if (q) {
        const haystack = [
          img.fusionName,
          img.baseLabel,
          img.blendLabel,
          img.industryLabel,
          img.model,
          img.prompt,
          img.fusionEntryId,
          img.bucketPath,
        ].filter(Boolean).join(' ').toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [images, search, industry, model, chaosMin, chaosMax, orphanFilter])

  const lightboxImages = useMemo(
    () => filtered.map(img => ({
      url: img.url,
      prompt: img.prompt ?? '(no prompt recorded — orphaned image)',
      createdAt: img.createdAt,
      model: img.model ?? 'unknown',
    })),
    [filtered],
  )

  if (error) {
    return <div className="p-6 text-sm text-rose-400">Failed to load library: {error}</div>
  }
  if (!images) {
    return <div className="p-6 text-sm text-[var(--brand-text-mid)]">Loading library…</div>
  }

  return (
    <div className="space-y-5">
      <header className="flex items-baseline justify-between flex-wrap gap-2">
        <h1 className="text-xl sm:text-2xl font-black text-[var(--brand-text)]">Image Library</h1>
        {facets && (
          <p className="text-xs text-[var(--brand-text-mid)]">
            {facets.totalCount} image{facets.totalCount === 1 ? '' : 's'} · {facets.orphanCount} orphan{facets.orphanCount === 1 ? '' : 's'} · showing {filtered.length}
          </p>
        )}
      </header>

      <section className="rounded-xl border border-[var(--brand-border)] bg-[var(--brand-card)] p-3 sm:p-4 space-y-3">
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by fusion name, strand, prompt, entry id…"
          className="w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-bg)] px-3 py-2 text-sm text-[var(--brand-text)] placeholder:text-[var(--brand-text-mid)] focus:outline-none focus:border-[var(--brand-primary)]"
        />
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={industry}
            onChange={e => setIndustry(e.target.value)}
            className="rounded border border-[var(--brand-border)] bg-[var(--brand-bg)] px-2 py-1.5 text-[var(--brand-text)]"
          >
            <option value="">All industries</option>
            {facets?.industries.map(id => <option key={id} value={id}>{id}</option>)}
          </select>
          <select
            value={model}
            onChange={e => setModel(e.target.value)}
            className="rounded border border-[var(--brand-border)] bg-[var(--brand-bg)] px-2 py-1.5 text-[var(--brand-text)]"
          >
            <option value="">All models</option>
            {facets?.models.map(id => <option key={id} value={id}>{id}</option>)}
          </select>
          <select
            value={orphanFilter}
            onChange={e => setOrphanFilter(e.target.value as OrphanFilter)}
            className="rounded border border-[var(--brand-border)] bg-[var(--brand-bg)] px-2 py-1.5 text-[var(--brand-text)]"
          >
            {ORPHAN_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
          <div className="flex items-center gap-1.5 text-[var(--brand-text-mid)]">
            <span>Chaos</span>
            <input
              type="number" min={0} max={100} value={chaosMin}
              onChange={e => setChaosMin(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
              className="w-14 rounded border border-[var(--brand-border)] bg-[var(--brand-bg)] px-2 py-1 text-[var(--brand-text)] tabular-nums"
            />
            <span>–</span>
            <input
              type="number" min={0} max={100} value={chaosMax}
              onChange={e => setChaosMax(Math.max(0, Math.min(100, Number(e.target.value) || 100)))}
              className="w-14 rounded border border-[var(--brand-border)] bg-[var(--brand-bg)] px-2 py-1 text-[var(--brand-text)] tabular-nums"
            />
            <span className="text-[10px]">(images with no chaos value always show)</span>
          </div>
          {(search || industry || model || orphanFilter !== 'include' || chaosMin > 0 || chaosMax < 100) && (
            <button
              type="button"
              onClick={() => { setSearch(''); setIndustry(''); setModel(''); setOrphanFilter('include'); setChaosMin(0); setChaosMax(100) }}
              className="text-[var(--brand-text-mid)] hover:text-[var(--brand-text)] underline cursor-pointer"
            >
              Clear filters
            </button>
          )}
        </div>
      </section>

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-[var(--brand-text-mid)]">
          No images match the current filters.
        </p>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filtered.map((img, i) => (
            <li key={img.id}>
              <button
                type="button"
                onClick={() => setLightboxIndex(i)}
                className="group block w-full rounded-lg overflow-hidden border border-[var(--brand-border)] hover:border-[var(--brand-primary)] bg-[var(--brand-card)] text-left transition-colors cursor-zoom-in"
              >
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={img.fusionName ?? 'Orphaned flash design'} className="w-full aspect-square object-cover" loading="lazy" />
                  {typeof img.chaos === 'number' && (
                    <span className="absolute top-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white tabular-nums">
                      chaos {img.chaos}
                    </span>
                  )}
                  {img.isOrphan && (
                    <span className="absolute top-1 right-1 rounded bg-amber-500/90 px-1.5 py-0.5 text-[10px] font-bold text-black uppercase">
                      orphan
                    </span>
                  )}
                </div>
                <div className="px-2 py-2 space-y-0.5">
                  <div className="text-xs font-semibold text-[var(--brand-text)] truncate">
                    {img.fusionName ?? `Orphan · ${img.fusionEntryId.slice(0, 12)}…`}
                  </div>
                  <div className="text-[10px] text-[var(--brand-text-mid)] truncate">
                    {img.baseLabel && img.blendLabel
                      ? `${img.baseLabel} × ${img.blendLabel}`
                      : img.industryLabel ?? 'no metadata'}
                  </div>
                  <div className="text-[10px] text-[var(--brand-text-mid)] truncate">
                    {new Date(img.createdAt).toLocaleDateString()} · {img.model ?? 'unknown model'}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <ImageLightbox
        images={lightboxImages}
        activeIndex={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onNavigate={i => setLightboxIndex(i)}
      />
    </div>
  )
}
