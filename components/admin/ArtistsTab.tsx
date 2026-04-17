'use client'
import { useState } from 'react'
import SaveBar from './SaveBar'
import type { Artist } from '@/lib/types'

interface Props { initialData: Artist[] }

const ALL_STYLES = ['fine-line', 'traditional', 'geometric', 'polynesian', 'realism'] as const
const TIER_LABELS = { 1: 'Tier 1 — Artist', 2: 'Tier 2 — Senior', 3: 'Tier 3 — Featured' }

const BLANK_ARTIST: Artist = {
  id: '', name: '', tier: 1, bio: '',
  styles: [], doesColor: true, doesBlackGrey: true,
  instagramUrl: '', bookingUrl: `mailto:sean_m@tattoolicious.com`, photo: '',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-[#555555] uppercase tracking-wide mb-1">{label}</label>
      {children}
    </div>
  )
}

const INPUT = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#0A0A0A] focus:outline-none focus:ring-2 focus:ring-[#7B0000] focus:border-transparent"

export default function ArtistsTab({ initialData }: Props) {
  const [artists, setArtists] = useState<Artist[]>(initialData)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Artist | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function startEdit(artist: Artist) {
    setEditingId(artist.id)
    setEditDraft({ ...artist })
  }

  function startAdd() {
    const newId = `artist-${Date.now()}`
    const blank = { ...BLANK_ARTIST, id: newId }
    setEditingId(newId)
    setEditDraft(blank)
  }

  function cancelEdit() { setEditingId(null); setEditDraft(null) }

  function applyEdit() {
    if (!editDraft) return
    setArtists(prev => {
      const exists = prev.find(a => a.id === editDraft.id)
      return exists ? prev.map(a => a.id === editDraft.id ? editDraft : a) : [...prev, editDraft]
    })
    setEditingId(null); setEditDraft(null)
  }

  function removeArtist(id: string) {
    setArtists(prev => prev.filter(a => a.id !== id))
  }

  function toggleStyle(style: string) {
    if (!editDraft) return
    const styles = editDraft.styles.includes(style as never)
      ? editDraft.styles.filter(s => s !== style)
      : [...editDraft.styles, style as never]
    setEditDraft({ ...editDraft, styles })
  }

  async function handleSave() {
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/admin/config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'artists', data: artists }) })
      if (!res.ok) throw new Error('Save failed')
      setSaved(true); setTimeout(() => setSaved(false), 2500)
    } catch (e) { setError(e instanceof Error ? e.message : 'Error') }
    finally { setSaving(false) }
  }

  const d = editDraft

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-[#0A0A0A]">Artists</h2>
          <span className="text-sm text-[#555555]">{artists.length} total</span>
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="text-sm text-green-600 font-medium">✓ Saved</span>}
          {error && <span className="text-sm text-red-600">{error}</span>}
          <button type="button" onPointerDown={startAdd}
            className="rounded-lg border border-[#7B0000] px-4 py-2 text-sm font-bold text-[#7B0000] hover:bg-[#7B0000]/5 cursor-pointer">
            + Add Artist
          </button>
          <button type="button" onClick={handleSave} disabled={saving}
            className="rounded-lg bg-[#7B0000] px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60 cursor-pointer">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Edit panel */}
      {d && (
        <div className="rounded-xl bg-white border-2 border-[#7B0000] p-5 mb-6">
          <h3 className="text-sm font-bold text-[#7B0000] uppercase tracking-wide mb-4">
            {artists.find(a => a.id === d.id) ? `Editing: ${d.name || 'Artist'}` : 'New Artist'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <Field label="Full Name">
              <input value={d.name} onChange={e => setEditDraft({ ...d, name: e.target.value })} className={INPUT} placeholder="Artist Name" />
            </Field>
            <Field label="Tier">
              <select value={d.tier} onChange={e => setEditDraft({ ...d, tier: Number(e.target.value) as 1|2|3 })} className={INPUT}>
                {[1, 2, 3].map(t => <option key={t} value={t}>{TIER_LABELS[t as 1|2|3]}</option>)}
              </select>
            </Field>
            <Field label="Bio (one sentence)">
              <input value={d.bio} onChange={e => setEditDraft({ ...d, bio: e.target.value })} className={INPUT} placeholder="Specializes in…" />
            </Field>
            <Field label="Photo URL">
              <input value={d.photo} onChange={e => setEditDraft({ ...d, photo: e.target.value })} className={INPUT} placeholder="/artists/name.jpg" />
            </Field>
            <Field label="Instagram URL">
              <input value={d.instagramUrl} onChange={e => setEditDraft({ ...d, instagramUrl: e.target.value })} className={INPUT} placeholder="https://instagram.com/handle" />
            </Field>
            <Field label="Booking URL">
              <input value={d.bookingUrl} onChange={e => setEditDraft({ ...d, bookingUrl: e.target.value })} className={INPUT} placeholder="https://… or mailto:…" />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <Field label="Styles">
              <div className="flex flex-wrap gap-2 mt-1">
                {ALL_STYLES.map(s => (
                  <button key={s} type="button" onPointerDown={() => toggleStyle(s)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium cursor-pointer transition-all
                      ${d.styles.includes(s) ? 'border-[#7B0000] bg-[#7B0000] text-white' : 'border-gray-300 text-[#555555] hover:border-[#7B0000]'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Works in">
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="checkbox" checked={d.doesColor} onChange={e => setEditDraft({ ...d, doesColor: e.target.checked })} className="rounded" />
                  Color
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="checkbox" checked={d.doesBlackGrey} onChange={e => setEditDraft({ ...d, doesBlackGrey: e.target.checked })} className="rounded" />
                  Black &amp; Grey
                </label>
              </div>
            </Field>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={applyEdit}
              className="rounded-lg bg-[#7B0000] px-4 py-2 text-sm font-bold text-white hover:opacity-90 cursor-pointer">
              Apply
            </button>
            <button type="button" onClick={cancelEdit}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-[#555555] hover:bg-gray-50 cursor-pointer">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Artist list */}
      <div className="space-y-2">
        {artists.map(artist => (
          <div key={artist.id} className={`rounded-xl bg-white border px-5 py-4 flex items-center justify-between gap-4 ${editingId === artist.id ? 'border-[#7B0000]' : 'border-gray-200'}`}>
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-10 h-10 rounded-full bg-[#F5F5F0] border border-gray-200 flex items-center justify-center text-lg shrink-0">🎨</div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-[#0A0A0A] text-sm">{artist.name || <em className="text-[#555555]">Unnamed</em>}</span>
                  <span className="text-xs text-[#7B0000] font-medium">{TIER_LABELS[artist.tier]}</span>
                </div>
                <p className="text-xs text-[#555555] truncate">{artist.bio}</p>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {artist.styles.map(s => (
                    <span key={s} className="text-xs bg-gray-100 rounded px-1.5 py-0.5 text-[#555555]">{s}</span>
                  ))}
                  {artist.doesColor && <span className="text-xs bg-blue-50 rounded px-1.5 py-0.5 text-blue-700">color</span>}
                  {artist.doesBlackGrey && <span className="text-xs bg-gray-100 rounded px-1.5 py-0.5 text-[#555555]">b&g</span>}
                </div>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button type="button" onClick={() => startEdit(artist)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-[#0A0A0A] hover:bg-gray-50 cursor-pointer">
                Edit
              </button>
              <button type="button" onClick={() => removeArtist(artist.id)}
                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 cursor-pointer">
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
