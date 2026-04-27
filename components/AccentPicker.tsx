'use client'

import { useEffect, useState } from 'react'

const ACCENTS = [
  { id: 'indigo',  label: 'Indigo',  color: '#6366f1' },
  { id: 'teal',    label: 'Teal',    color: '#14b8a6' },
  { id: 'amber',   label: 'Amber',   color: '#f59e0b' },
  { id: 'rose',    label: 'Rose',    color: '#f43f5e' },
  { id: 'emerald', label: 'Emerald', color: '#10b981' },
] as const

const STORAGE_KEY = 'spm-accent'
const VALID: ReadonlySet<string> = new Set(ACCENTS.map(a => a.id))

export default function AccentPicker() {
  // Start at indigo so server-rendered HTML matches first client render
  // (no hydration mismatch). The effect below syncs from the DOM, which
  // the inline bootstrap script in app/layout.tsx already set from
  // localStorage before paint.
  const [accent, setAccent] = useState<string>('indigo')

  useEffect(() => {
    const live = document.documentElement.getAttribute('data-accent') ?? 'indigo'
    // eslint-disable-next-line react-hooks/set-state-in-effect -- post-hydration sync from DOM, not a render loop
    if (VALID.has(live) && live !== 'indigo') setAccent(live)
  }, [])

  function pick(id: string) {
    setAccent(id)
    document.documentElement.setAttribute('data-accent', id)
    try { localStorage.setItem(STORAGE_KEY, id) } catch {}
  }

  return (
    <div className="flex items-center gap-1.5" role="group" aria-label="Accent color">
      {ACCENTS.map(a => {
        const active = a.id === accent
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => pick(a.id)}
            aria-label={a.label}
            aria-pressed={active}
            title={a.label}
            className={`w-4 h-4 rounded-full border transition-transform ${
              active ? 'scale-110 border-white' : 'border-transparent opacity-60 hover:opacity-100'
            }`}
            style={{ backgroundColor: a.color }}
          />
        )
      })}
    </div>
  )
}
