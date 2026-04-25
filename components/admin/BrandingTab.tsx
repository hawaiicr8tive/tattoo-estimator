'use client'
import { useState, useEffect } from 'react'
import { applyBranding } from '@/components/BrandingProvider'
import { BRANDING_DEFAULTS } from '@/lib/branding'
import type { BrandingConfig } from '@/lib/branding'
import SaveBar from './SaveBar'

const FIELDS: { key: keyof BrandingConfig; label: string; hint: string }[] = [
  { key: 'primary',     label: 'Accent / Buttons',   hint: 'Main brand color — buttons, progress bar, highlights' },
  { key: 'primaryText', label: 'Button Text',         hint: 'Text color on accent-colored backgrounds' },
  { key: 'background',  label: 'Page Background',     hint: 'Overall page background color' },
  { key: 'cardBg',      label: 'Card Background',     hint: 'White cards and panels' },
  { key: 'textDark',    label: 'Primary Text',        hint: 'Headings and main body text' },
  { key: 'textMid',     label: 'Secondary Text',      hint: 'Descriptions and helper text' },
  { key: 'border',      label: 'Borders',             hint: 'Input and card border color' },
]

function hexToRgb(hex: string): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!m) return '0,0,0'
  return `${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)}`
}

interface Props { initialData?: Partial<BrandingConfig> }

export default function BrandingTab({ initialData = {} }: Props) {
  const [cfg, setCfg] = useState<BrandingConfig>({ ...BRANDING_DEFAULTS, ...initialData })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { applyBranding(cfg) }, [cfg])

  function update(key: keyof BrandingConfig, value: string) {
    setCfg(c => ({ ...c, [key]: value }))
  }

  async function handleSave() {
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'branding', data: cfg }),
      })
      if (!res.ok) throw new Error('Save failed')
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  const rgb = hexToRgb(cfg.primary)

  return (
    <div>
      <SaveBar title="Branding & Colors" saving={saving} saved={saved} error={error} onSave={handleSave} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Color pickers */}
        <div className="space-y-3">
          {FIELDS.map(f => (
            <div key={f.key} className="rounded-xl bg-white border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-semibold text-[#0A0A0A]">{f.label}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={cfg[f.key]}
                    onChange={e => update(f.key, e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border border-gray-200 p-0.5"
                  />
                  <input
                    type="text"
                    value={cfg[f.key]}
                    onChange={e => {
                      const v = e.target.value
                      if (/^#[0-9a-fA-F]{0,6}$/.test(v)) update(f.key, v)
                    }}
                    maxLength={7}
                    className="w-24 rounded border border-gray-200 px-2 py-1 text-xs font-mono text-[#0A0A0A] focus:outline-none focus:ring-1 focus:ring-[#7B0000]"
                  />
                </div>
              </div>
              <p className="text-xs text-[#555555]">{f.hint}</p>
            </div>
          ))}

          {/* Settings */}
          <div className="rounded-xl bg-white border border-gray-200 p-4">
            <p className="text-xs font-bold text-[#555555] uppercase tracking-wide mb-3">Settings</p>
            <div>
              <label className="block text-sm font-semibold text-[#0A0A0A] mb-1">Booking URL</label>
              <input
                type="url"
                value={cfg.bookingUrl}
                onChange={e => setCfg(c => ({ ...c, bookingUrl: e.target.value }))}
                placeholder="https://your-booking-site.com/book"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-[#0A0A0A] focus:outline-none focus:ring-1 focus:ring-[#7B0000]"
              />
              <p className="mt-1 text-xs text-[#555555]">The link on the &ldquo;Ready to book?&rdquo; button on results pages</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setCfg(BRANDING_DEFAULTS)}
            className="text-xs text-[#555555] underline hover:text-[#0A0A0A] cursor-pointer mt-2"
          >
            Reset to defaults
          </button>
        </div>

        {/* Live preview */}
        <div>
          <p className="text-xs font-bold text-[#555555] uppercase tracking-wide mb-3">Live Preview</p>
          <div style={{ background: cfg.background }} className="rounded-2xl p-5 space-y-4">
            <div className="text-center">
              <p className="text-lg font-black" style={{ color: cfg.textDark }}>Tattoolicious</p>
              <p className="text-xs" style={{ color: cfg.textMid }}>Price Estimator</p>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: cfg.border }}>
              <div className="h-full rounded-full w-3/5" style={{ background: cfg.primary }} />
            </div>

            {/* Estimator card */}
            <div style={{ background: cfg.cardBg, borderColor: cfg.border }} className="rounded-xl border p-4 space-y-3">
              <p className="text-sm font-bold" style={{ color: cfg.textDark }}>What style are you looking for?</p>

              <div className="flex flex-wrap gap-2">
                {['Fine Line', 'Traditional', 'Realism'].map((s, i) => (
                  <span
                    key={s}
                    style={
                      i === 0
                        ? { borderColor: cfg.primary, background: `rgba(${rgb},0.08)`, color: cfg.textDark }
                        : { borderColor: cfg.border, background: cfg.cardBg, color: cfg.textDark }
                    }
                    className="rounded-lg border px-3 py-1 text-xs font-medium"
                  >
                    {i === 0 && <span style={{ color: cfg.primary }}>✓ </span>}
                    {s}
                  </span>
                ))}
              </div>

              <input
                readOnly
                value="your@email.com"
                style={{ borderColor: cfg.border, color: cfg.textMid, background: cfg.cardBg }}
                className="w-full rounded-lg border px-3 py-2 text-xs"
              />

              <button
                type="button"
                style={{ background: cfg.primary, color: cfg.primaryText }}
                className="w-full rounded-lg py-2.5 text-xs font-bold cursor-pointer"
              >
                Show My Estimate →
              </button>
            </div>

            {/* Booking CTA preview */}
            <div style={{ background: cfg.primary }} className="rounded-xl p-4 text-center">
              <p className="text-sm font-black mb-1" style={{ color: cfg.primaryText }}>Ready to book?</p>
              <p className="text-xs mb-3" style={{ color: cfg.primaryText, opacity: 0.75 }}>Book a free consultation</p>
              <span style={{ background: cfg.cardBg, color: cfg.primary }} className="inline-block rounded-lg px-4 py-1.5 text-xs font-bold">
                Book Now →
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
