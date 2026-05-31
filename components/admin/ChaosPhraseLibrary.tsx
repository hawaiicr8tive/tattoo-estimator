'use client'

import { useEffect, useMemo, useState } from 'react'

interface ChaosCategory { id: string; label: string; description?: string }
interface ChaosTag { id: string; label: string }
interface ChaosPhrase {
  id: string
  phrase: string
  description?: string
  categoryId: string
  tagIds?: string[]
}
interface ChaosLibrary {
  categories: ChaosCategory[]
  tags: ChaosTag[]
  phrases: ChaosPhrase[]
}

type ViewMode = 'category' | 'tag'

export default function ChaosPhraseLibraryView() {
  const [library, setLibrary] = useState<ChaosLibrary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [view, setView] = useState<ViewMode>('category')
  const [activeCategory, setActiveCategory] = useState<string>('')
  const [activeTag, setActiveTag] = useState<string>('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Add form state
  const [showAdd, setShowAdd] = useState(false)
  const [newPhrase, setNewPhrase] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newCategoryId, setNewCategoryId] = useState('')
  const [newCategoryLabel, setNewCategoryLabel] = useState('')
  const [newTagIds, setNewTagIds] = useState<Set<string>>(new Set())
  const [adding, setAdding] = useState(false)
  const [addStatus, setAddStatus] = useState<{ ok: boolean; message: string } | null>(null)

  useEffect(() => { void refresh() }, [])
  async function refresh() {
    try {
      const res = await fetch('/api/admin/chaos-phrases')
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `Load failed (HTTP ${res.status})`)
      }
      const data = await res.json() as ChaosLibrary
      setLibrary(data)
      if (!activeCategory && data.categories.length > 0) setActiveCategory(data.categories[0].id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed')
    }
  }

  const filtered = useMemo(() => {
    if (!library) return []
    const q = search.trim().toLowerCase()
    return library.phrases.filter(p => {
      if (view === 'category' && activeCategory && p.categoryId !== activeCategory) return false
      if (view === 'tag' && activeTag && !(p.tagIds ?? []).includes(activeTag)) return false
      if (q) {
        const hay = [p.phrase, p.description, p.categoryId, ...(p.tagIds ?? [])].filter(Boolean).join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [library, search, view, activeCategory, activeTag])

  // Counts for category / tag chips so user knows what's actually populated.
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    if (!library) return counts
    for (const p of library.phrases) counts[p.categoryId] = (counts[p.categoryId] ?? 0) + 1
    return counts
  }, [library])
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    if (!library) return counts
    for (const p of library.phrases) for (const t of p.tagIds ?? []) counts[t] = (counts[t] ?? 0) + 1
    return counts
  }, [library])

  async function copy(p: ChaosPhrase) {
    try {
      await navigator.clipboard.writeText(p.phrase)
      setCopiedId(p.id)
      setTimeout(() => setCopiedId(prev => (prev === p.id ? null : prev)), 1500)
    } catch {
      setCopiedId(null)
    }
  }

  function toggleNewTag(id: string) {
    setNewTagIds(s => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleAdd() {
    if (!newPhrase.trim()) { setAddStatus({ ok: false, message: 'Phrase text is required' }); return }
    if (!newCategoryId && !newCategoryLabel.trim()) { setAddStatus({ ok: false, message: 'Pick a category or type a new one' }); return }
    setAdding(true); setAddStatus(null)
    try {
      const res = await fetch('/api/admin/chaos-phrases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phrase: newPhrase.trim(),
          description: newDescription.trim() || undefined,
          categoryId: newCategoryId || undefined,
          newCategoryLabel: newCategoryId ? undefined : newCategoryLabel.trim(),
          tagIds: Array.from(newTagIds),
        }),
      })
      const data: unknown = await res.json().catch(() => null)
      if (!res.ok || data === null) {
        const msg = (data && typeof data === 'object' && 'error' in data && typeof (data as { error: unknown }).error === 'string')
          ? (data as { error: string }).error
          : `Add failed (HTTP ${res.status})`
        throw new Error(msg)
      }
      setLibrary((data as { library: ChaosLibrary }).library)
      setAddStatus({ ok: true, message: 'Phrase added.' })
      setNewPhrase('')
      setNewDescription('')
      setNewCategoryLabel('')
      setNewTagIds(new Set())
    } catch (e) {
      setAddStatus({ ok: false, message: e instanceof Error ? e.message : 'Add failed' })
    } finally {
      setAdding(false)
    }
  }

  if (error) return <p className="text-rose-500 text-sm">Failed to load: {error}</p>
  if (!library) return <p className="text-[var(--brand-text-mid)] text-sm">Loading…</p>

  return (
    <div className="space-y-5">
      <header className="flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[var(--brand-text)]">Chaos Direction Library</h1>
          <p className="text-xs text-[var(--brand-text-mid)] mt-1">
            {library.phrases.length} phrases · {library.categories.length} categories · {library.tags.length} tags · cross-tagged so similar styles cluster.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(v => !v)}
          className="px-3 py-1.5 rounded-lg text-sm font-semibold text-[var(--brand-primary-text)] cursor-pointer"
          style={{ background: 'var(--brand-gradient)', boxShadow: '0 0 14px var(--brand-glow)' }}
        >
          {showAdd ? 'Hide add form' : '+ Add new phrase'}
        </button>
      </header>

      {showAdd && (
        <section className="rounded-xl border border-[var(--brand-border)] bg-[var(--brand-card)] p-3 sm:p-4 space-y-3">
          <h2 className="text-sm font-bold text-[var(--brand-text)]">Add a phrase</h2>
          <textarea
            value={newPhrase}
            onChange={e => setNewPhrase(e.target.value.slice(0, 400))}
            placeholder="Phrase text (e.g. 'Sailor Jerry traditional, bold + limited palette')"
            rows={2}
            className="w-full rounded border border-[var(--brand-border)] bg-[var(--brand-bg)] px-2 py-1.5 text-sm text-[var(--brand-text)] placeholder:text-[var(--brand-text-mid)]"
          />
          <input
            type="text"
            value={newDescription}
            onChange={e => setNewDescription(e.target.value.slice(0, 200))}
            placeholder="Short description of what it pushes (optional)"
            className="w-full rounded border border-[var(--brand-border)] bg-[var(--brand-bg)] px-2 py-1.5 text-xs text-[var(--brand-text)] placeholder:text-[var(--brand-text-mid)]"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label className="block">
              <span className="text-[10px] uppercase tracking-wide text-[var(--brand-text-mid)]">Category</span>
              <select
                value={newCategoryId}
                onChange={e => { setNewCategoryId(e.target.value); if (e.target.value) setNewCategoryLabel('') }}
                className="mt-1 w-full rounded border border-[var(--brand-border)] bg-[var(--brand-bg)] px-2 py-1.5 text-xs text-[var(--brand-text)]"
              >
                <option value="">— pick existing or type new →</option>
                {library.categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-[10px] uppercase tracking-wide text-[var(--brand-text-mid)]">Or new category label</span>
              <input
                type="text"
                value={newCategoryLabel}
                onChange={e => { setNewCategoryLabel(e.target.value.slice(0, 60)); if (e.target.value) setNewCategoryId('') }}
                disabled={!!newCategoryId}
                placeholder="e.g. Anime / Manga"
                className="mt-1 w-full rounded border border-[var(--brand-border)] bg-[var(--brand-bg)] px-2 py-1.5 text-xs text-[var(--brand-text)] placeholder:text-[var(--brand-text-mid)] disabled:opacity-50"
              />
            </label>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-[var(--brand-text-mid)] mb-1">Tags (cross-cutting)</div>
            <div className="flex flex-wrap gap-1.5">
              {library.tags.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleNewTag(t.id)}
                  className={`text-[10px] rounded-full px-2 py-0.5 border cursor-pointer ${
                    newTagIds.has(t.id)
                      ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)] text-[var(--brand-primary-text)]'
                      : 'border-[var(--brand-border)] text-[var(--brand-text-mid)] hover:border-[var(--brand-primary)]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleAdd}
              disabled={adding}
              className="px-3 py-1.5 rounded text-sm font-semibold text-[var(--brand-primary-text)] disabled:opacity-50 cursor-pointer"
              style={{ background: 'var(--brand-gradient)' }}
            >
              {adding ? 'Adding…' : 'Save phrase'}
            </button>
            {addStatus && (
              <span className={`text-xs ${addStatus.ok ? 'text-emerald-500' : 'text-rose-500'}`}>
                {addStatus.message}
              </span>
            )}
          </div>
        </section>
      )}

      <section className="rounded-xl border border-[var(--brand-border)] bg-[var(--brand-card)] p-3 sm:p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[var(--brand-text-mid)]">View by:</span>
          <button
            type="button"
            onClick={() => setView('category')}
            className={`rounded px-2 py-1 ${view === 'category' ? 'bg-[var(--brand-primary)] text-[var(--brand-primary-text)]' : 'border border-[var(--brand-border)] text-[var(--brand-text-mid)]'}`}
          >Category</button>
          <button
            type="button"
            onClick={() => setView('tag')}
            className={`rounded px-2 py-1 ${view === 'tag' ? 'bg-[var(--brand-primary)] text-[var(--brand-primary-text)]' : 'border border-[var(--brand-border)] text-[var(--brand-text-mid)]'}`}
          >Tag (cross-cutting)</button>
        </div>

        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search phrase text, description, or tag…"
          className="w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-bg)] px-3 py-2 text-sm text-[var(--brand-text)] placeholder:text-[var(--brand-text-mid)]"
        />

        {view === 'category' ? (
          <div className="flex flex-wrap gap-1.5">
            {library.categories.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCategory(c.id)}
                className={`text-xs rounded-full px-3 py-1 border cursor-pointer ${
                  activeCategory === c.id
                    ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)] text-[var(--brand-primary-text)]'
                    : 'border-[var(--brand-border)] text-[var(--brand-text)] hover:border-[var(--brand-primary)]'
                }`}
              >
                {c.label} <span className="opacity-60">({categoryCounts[c.id] ?? 0})</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTag('')}
              className={`text-xs rounded-full px-3 py-1 border cursor-pointer ${
                activeTag === ''
                  ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)] text-[var(--brand-primary-text)]'
                  : 'border-[var(--brand-border)] text-[var(--brand-text)] hover:border-[var(--brand-primary)]'
              }`}
            >
              All ({library.phrases.length})
            </button>
            {library.tags.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTag(t.id)}
                className={`text-xs rounded-full px-3 py-1 border cursor-pointer ${
                  activeTag === t.id
                    ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)] text-[var(--brand-primary-text)]'
                    : 'border-[var(--brand-border)] text-[var(--brand-text)] hover:border-[var(--brand-primary)]'
                }`}
              >
                {t.label} <span className="opacity-60">({tagCounts[t.id] ?? 0})</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-[var(--brand-text-mid)]">No phrases match the current filters.</p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(p => {
            const cat = library.categories.find(c => c.id === p.categoryId)
            return (
              <li key={p.id} className="rounded-lg border border-[var(--brand-border)] bg-[var(--brand-card)] p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] uppercase tracking-wide text-[var(--brand-text-mid)]">{cat?.label ?? p.categoryId}</span>
                  <button
                    type="button"
                    onClick={() => copy(p)}
                    className="text-[10px] rounded border border-[var(--brand-border)] px-1.5 py-0.5 text-[var(--brand-text-mid)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-text)]"
                  >
                    {copiedId === p.id ? '✓ copied' : 'copy'}
                  </button>
                </div>
                <p className="text-sm text-[var(--brand-text)] font-medium">{p.phrase}</p>
                {p.description && <p className="text-[11px] text-[var(--brand-text-mid)]">{p.description}</p>}
                {p.tagIds && p.tagIds.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {p.tagIds.map(tid => {
                      const tag = library.tags.find(t => t.id === tid)
                      return (
                        <span key={tid} className="text-[9px] rounded-full bg-[var(--brand-bg)] border border-[var(--brand-border)] px-1.5 py-0.5 text-[var(--brand-text-mid)]">
                          {tag?.label ?? tid}
                        </span>
                      )
                    })}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
