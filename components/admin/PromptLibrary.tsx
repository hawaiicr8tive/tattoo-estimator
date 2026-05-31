'use client'

import { useEffect, useMemo, useState } from 'react'

interface PromptDraft {
  id: string
  name: string
  text: string
  createdAt: string
}

export default function PromptLibrary() {
  const [drafts, setDrafts] = useState<PromptDraft[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Add form
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newText, setNewText] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<{ ok: boolean; message: string } | null>(null)

  // Edit state — when not null, the row with this id is in edit mode.
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editText, setEditText] = useState('')

  useEffect(() => { void refresh() }, [])

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/prompt-drafts')
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `Load failed (HTTP ${res.status})`)
      }
      const data = await res.json() as { drafts?: PromptDraft[] }
      setDrafts(data.drafts ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed')
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return drafts
    return drafts.filter(d => `${d.name} ${d.text}`.toLowerCase().includes(q))
  }, [drafts, search])

  async function copy(d: PromptDraft) {
    try {
      await navigator.clipboard.writeText(d.text)
      setCopiedId(d.id)
      setTimeout(() => setCopiedId(prev => (prev === d.id ? null : prev)), 1500)
    } catch { /* ignore */ }
  }

  async function handleAdd() {
    if (!newName.trim()) { setSaveStatus({ ok: false, message: 'Name required' }); return }
    if (!newText.trim()) { setSaveStatus({ ok: false, message: 'Prompt text required' }); return }
    setSaving(true); setSaveStatus(null)
    try {
      const res = await fetch('/api/admin/prompt-drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), text: newText.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Save failed')
      setDrafts(data.drafts ?? [])
      setSaveStatus({ ok: true, message: 'Saved.' })
      setNewName('')
      setNewText('')
    } catch (e) {
      setSaveStatus({ ok: false, message: e instanceof Error ? e.message : 'Save failed' })
    } finally {
      setSaving(false)
    }
  }

  function startEdit(d: PromptDraft) {
    setEditingId(d.id)
    setEditName(d.name)
    setEditText(d.text)
    setExpandedId(d.id) // expand so the edit form is visible
  }
  function cancelEdit() {
    setEditingId(null)
    setEditName('')
    setEditText('')
  }
  async function saveEdit() {
    if (!editingId) return
    if (!editName.trim() || !editText.trim()) return
    try {
      const res = await fetch('/api/admin/prompt-drafts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId, name: editName.trim(), text: editText.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Update failed')
      setDrafts(data.drafts ?? [])
      cancelEdit()
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Update failed')
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this saved prompt? Cannot be undone.')) return
    try {
      const res = await fetch(`/api/admin/prompt-drafts?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Delete failed')
      setDrafts(data.drafts ?? [])
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-[var(--brand-text)]">Prompt Library</h2>
          <p className="text-xs text-[var(--brand-text-mid)] mt-1">
            {drafts.length} saved prompts — name-driven style resource that feeds the Fusion Lab secondary descriptor.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(v => !v)}
          className="px-3 py-1.5 rounded-lg text-sm font-semibold text-[var(--brand-primary-text)] cursor-pointer"
          style={{ background: 'var(--brand-gradient)', boxShadow: '0 0 14px var(--brand-glow)' }}
        >
          {showAdd ? 'Hide add form' : '+ Add new prompt'}
        </button>
      </header>

      {showAdd && (
        <section className="rounded-xl border border-[var(--brand-border)] bg-[var(--brand-card)] p-3 sm:p-4 space-y-2">
          <h3 className="text-sm font-bold text-[var(--brand-text)]">Add a saved prompt</h3>
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value.slice(0, 80))}
            placeholder="Style heading (e.g. Americana Traditional, Polynesian Tribal)"
            className="w-full rounded border border-[var(--brand-border)] bg-[var(--brand-bg)] px-2 py-1.5 text-sm text-[var(--brand-text)] placeholder:text-[var(--brand-text-mid)]"
          />
          <textarea
            value={newText}
            onChange={e => setNewText(e.target.value)}
            placeholder="Full prompt text — this is what gets injected into image generation when the prompt is loaded into Fusion Lab"
            rows={6}
            className="w-full rounded border border-[var(--brand-border)] bg-[var(--brand-bg)] px-2 py-1.5 text-xs text-[var(--brand-text)] placeholder:text-[var(--brand-text-mid)] leading-relaxed"
          />
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleAdd}
              disabled={saving}
              className="px-3 py-1.5 rounded text-sm font-semibold text-[var(--brand-primary-text)] disabled:opacity-50 cursor-pointer"
              style={{ background: 'var(--brand-gradient)' }}
            >
              {saving ? 'Saving…' : 'Save prompt'}
            </button>
            {saveStatus && (
              <span className={`text-xs ${saveStatus.ok ? 'text-emerald-500' : 'text-rose-500'}`}>
                {saveStatus.message}
              </span>
            )}
          </div>
        </section>
      )}

      <section className="rounded-xl border border-[var(--brand-border)] bg-[var(--brand-card)] p-3 sm:p-4 space-y-3">
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or prompt text…"
          className="w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-bg)] px-3 py-2 text-sm text-[var(--brand-text)] placeholder:text-[var(--brand-text-mid)]"
        />
        <div className="text-[10px] text-[var(--brand-text-mid)]">
          Showing {filtered.length}{search ? ` / ${drafts.length}` : ''} prompts
        </div>
      </section>

      {error && <p className="text-rose-500 text-sm">Failed to load: {error}</p>}
      {loading ? (
        <p className="text-[var(--brand-text-mid)] text-sm">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-[var(--brand-text-mid)]">
          {drafts.length === 0
            ? 'No saved prompts yet. Click "+ Add new prompt" above to start your library.'
            : `No prompts match "${search}".`}
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map(d => {
            const isExpanded = expandedId === d.id
            const isEditing = editingId === d.id
            return (
              <li key={d.id} className="rounded-lg border border-[var(--brand-border)] bg-[var(--brand-card)] p-3">
                {isEditing ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value.slice(0, 80))}
                      className="w-full rounded border border-[var(--brand-border)] bg-[var(--brand-bg)] px-2 py-1.5 text-sm text-[var(--brand-text)]"
                    />
                    <textarea
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      rows={6}
                      className="w-full rounded border border-[var(--brand-border)] bg-[var(--brand-bg)] px-2 py-1.5 text-xs text-[var(--brand-text)] leading-relaxed"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={saveEdit}
                        className="px-3 py-1 rounded text-xs font-semibold text-[var(--brand-primary-text)]"
                        style={{ background: 'var(--brand-gradient)' }}
                      >
                        Save changes
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="text-xs text-[var(--brand-text-mid)] hover:text-[var(--brand-text)] underline"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-baseline gap-2 min-w-0">
                        <span className="text-sm font-bold text-[var(--brand-text)] truncate">{d.name}</span>
                        <span className="text-[10px] text-[var(--brand-text-mid)] shrink-0">
                          {new Date(d.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 text-[10px]">
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : d.id)}
                          className="rounded border border-[var(--brand-border)] px-1.5 py-0.5 text-[var(--brand-text-mid)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-text)]"
                        >
                          {isExpanded ? 'Hide' : 'Show'}
                        </button>
                        <button
                          type="button"
                          onClick={() => copy(d)}
                          className="rounded border border-[var(--brand-border)] px-1.5 py-0.5 text-[var(--brand-text-mid)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-text)]"
                        >
                          {copiedId === d.id ? '✓ copied' : 'Copy'}
                        </button>
                        <button
                          type="button"
                          onClick={() => startEdit(d)}
                          className="rounded border border-[var(--brand-border)] px-1.5 py-0.5 text-[var(--brand-text-mid)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-text)]"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(d.id)}
                          className="rounded border border-rose-300 px-1.5 py-0.5 text-rose-400 hover:bg-rose-500/10"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    {isExpanded && (
                      <p className="mt-2 text-xs text-[var(--brand-text)] leading-relaxed whitespace-pre-wrap">{d.text}</p>
                    )}
                  </>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
