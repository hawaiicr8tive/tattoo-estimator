'use client'

import { useEffect, useState } from 'react'

const ACCENTS = [
  { id: 'indigo',  label: 'Indigo',  gradient: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', glow: 'rgba(99, 102, 241, 0.6)' },
  { id: 'teal',    label: 'Teal',    gradient: 'linear-gradient(135deg, #06b6d4 0%, #14b8a6 100%)', glow: 'rgba(20, 184, 166, 0.6)' },
  { id: 'amber',   label: 'Amber',   gradient: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)', glow: 'rgba(245, 158, 11, 0.6)' },
  { id: 'rose',    label: 'Rose',    gradient: 'linear-gradient(135deg, #f43f5e 0%, #d946ef 100%)', glow: 'rgba(244, 63, 94, 0.6)' },
  { id: 'emerald', label: 'Emerald', gradient: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)', glow: 'rgba(16, 185, 129, 0.6)' },
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
            className={`w-5 h-5 rounded-full border-2 transition-transform ${
              active ? 'scale-125 border-white' : 'border-transparent opacity-65 hover:opacity-100 hover:scale-110'
            }`}
            style={{
              background: a.gradient,
              boxShadow: active ? `0 0 14px ${a.glow}` : undefined,
            }}
          />
        )
      })}
    </div>
  )
}
