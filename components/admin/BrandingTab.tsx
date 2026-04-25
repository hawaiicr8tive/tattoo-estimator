'use client'
import { useState, useEffect } from 'react'
import { applyBranding } from '@/components/BrandingProvider'
import { BRANDING_DEFAULTS } from '@/lib/branding'
import type { BrandingConfig } from '@/lib/branding'
import SaveBar from './SaveBar'

const FIELDS: { key: keyof BrandingConfig; label: string; hint: string }[] = [
  { key: 'primary',     label: 'Accent Color',        hint: 'Best Match badge, progress bar, booking CTA panel, artist tier label' },
  { key: 'primaryText', label: 'Accent Text',         hint: 'Text color on accent-colored backgrounds (Best Match badge, booking CTA panel)' },
  { key: 'hoverColor',  label: 'Hover Highlight',     hint: 'Border color when hovering over a card or pill (uses 50% opacity on cards, full color on pills)' },
  { key: 'button',      label: 'Button Background',   hint: 'Main action buttons — Next, Show My Estimate, Book with [Artist]' },
  { key: 'buttonText',  label: 'Button Text',         hint: 'Text color on main action buttons' },
  { key: 'cardDefaultBg',   label: 'Default Card Color', hint: 'Background of unselected style/size/color cards' },
  { key: 'cardDefaultText', label: 'Default Card Text',  hint: 'Text color on unselected style/size/color cards' },
  { key: 'cardSelectedBg',     label: 'Selected Card Color',  hint: 'Fill color for selected style/size/color card' },
  { key: 'cardSelectedText',   label: 'Selected Card Text',   hint: 'Text color on selected style/size/color card' },
  { key: 'cardSelectedBorder', label: 'Selected Card Border', hint: 'Border color of the selected style/size/color card (separate from main accent)' },
  { key: 'pillDefaultBg',   label: 'Default Pill Color', hint: 'Background of unselected placement pills (Inner Arm, Forearm, etc. before they\'re tapped)' },
  { key: 'pillDefaultText', label: 'Default Pill Text',  hint: 'Text color on unselected placement pills' },
  { key: 'pillBg',             label: 'Selected Pill Color',  hint: 'Fill color for the placement pill once tapped' },
  { key: 'pillText',           label: 'Selected Pill Text',   hint: 'Text color on the selected placement pill' },
  { key: 'pillSelectedBorder', label: 'Selected Pill Border', hint: 'Border color of the selected placement pill (separate from main accent)' },
  { key: 'background',  label: 'Page Background',     hint: 'Overall page background (standalone site only — embed inherits Wix bg)' },
  { key: 'cardBg',      label: 'Card Background',     hint: 'Cards and panels' },
  { key: 'textDark',    label: 'Primary Text',        hint: 'Headings and main body text' },
  { key: 'textMid',     label: 'Secondary Text',      hint: 'Descriptions and helper text' },
  { key: 'resultPriceText', label: 'End Result Price Text', hint: 'Color of the big numbers on the results page (Estimated Cost, Session Time, day rates, sessions count)' },
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

          {/* Button Opacity */}
          <div className="rounded-xl bg-white border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-[#0A0A0A]">Button Opacity</label>
              <span className="text-xs font-mono text-[#555555] tabular-nums">{cfg.buttonOpacity}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={cfg.buttonOpacity}
              onChange={e => setCfg(c => ({ ...c, buttonOpacity: Number(e.target.value) }))}
              className="w-full accent-[#7B0000] cursor-pointer"
            />
            <p className="mt-2 text-xs text-[#555555]">
              Action buttons (Next, Show My Estimate, Book with [Artist]) — 0% = transparent · 100% = solid
            </p>
          </div>

          {/* Default Card Opacity */}
          <div className="rounded-xl bg-white border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-[#0A0A0A]">Default Card Opacity</label>
              <span className="text-xs font-mono text-[#555555] tabular-nums">{cfg.cardDefaultOpacity}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={cfg.cardDefaultOpacity}
              onChange={e => setCfg(c => ({ ...c, cardDefaultOpacity: Number(e.target.value) }))}
              className="w-full accent-[#7B0000] cursor-pointer"
            />
            <p className="mt-2 text-xs text-[#555555]">
              Opacity of unselected style/size/color cards (0% = transparent · 100% = solid)
            </p>
          </div>

          {/* Selected Card Opacity */}
          <div className="rounded-xl bg-white border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-[#0A0A0A]">Selected Card Opacity</label>
              <span className="text-xs font-mono text-[#555555] tabular-nums">{cfg.cardSelectedOpacity}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={cfg.cardSelectedOpacity}
              onChange={e => setCfg(c => ({ ...c, cardSelectedOpacity: Number(e.target.value) }))}
              className="w-full accent-[#7B0000] cursor-pointer"
            />
            <p className="mt-2 text-xs text-[#555555]">
              Opacity of the selected style/size/color card fill (5% gives the classic faint tint, 100% = solid)
            </p>
          </div>

          {/* Default Pill Opacity */}
          <div className="rounded-xl bg-white border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-[#0A0A0A]">Default Pill Opacity</label>
              <span className="text-xs font-mono text-[#555555] tabular-nums">{cfg.pillDefaultOpacity}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={cfg.pillDefaultOpacity}
              onChange={e => setCfg(c => ({ ...c, pillDefaultOpacity: Number(e.target.value) }))}
              className="w-full accent-[#7B0000] cursor-pointer"
            />
            <p className="mt-2 text-xs text-[#555555]">
              Opacity of the unselected pill background (0% = transparent · 100% = solid)
            </p>
          </div>

          {/* Selected Pill Opacity */}
          <div className="rounded-xl bg-white border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-[#0A0A0A]">Selected Pill Opacity</label>
              <span className="text-xs font-mono text-[#555555] tabular-nums">{cfg.pillOpacity}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={cfg.pillOpacity}
              onChange={e => setCfg(c => ({ ...c, pillOpacity: Number(e.target.value) }))}
              className="w-full accent-[#7B0000] cursor-pointer"
            />
            <p className="mt-2 text-xs text-[#555555]">
              0% = border only (transparent fill) · 100% = fully solid
            </p>
          </div>

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
                {['Fine Line', 'Traditional', 'Realism'].map((s, i) => {
                  const cardSelRgb = hexToRgb(cfg.cardSelectedBg)
                  const cardDefRgb = hexToRgb(cfg.cardDefaultBg)
                  return (
                    <span
                      key={s}
                      style={
                        i === 0
                          ? { borderColor: cfg.cardSelectedBorder, background: `rgba(${cardSelRgb},${cfg.cardSelectedOpacity / 100})`, color: cfg.cardSelectedText }
                          : { borderColor: cfg.border,             background: `rgba(${cardDefRgb},${cfg.cardDefaultOpacity / 100})`, color: cfg.cardDefaultText }
                      }
                      className="rounded-lg border px-3 py-1 text-xs font-medium"
                    >
                      {i === 0 && <span style={{ color: cfg.primary }}>✓ </span>}
                      {s}
                    </span>
                  )
                })}
              </div>

              {/* Placement pills (selected vs unselected) */}
              <div className="flex flex-wrap gap-2 pt-1">
                {[
                  { label: 'Inner Arm', selected: true },
                  { label: 'Forearm',   selected: false },
                  { label: 'Chest',     selected: false },
                ].map(p => {
                  const pillRgb = hexToRgb(cfg.pillBg)
                  const defaultRgb = hexToRgb(cfg.pillDefaultBg)
                  return (
                    <span
                      key={p.label}
                      style={p.selected
                        ? { borderColor: cfg.pillSelectedBorder, background: `rgba(${pillRgb},${cfg.pillOpacity / 100})`,         color: cfg.pillText }
                        : { borderColor: cfg.border,             background: `rgba(${defaultRgb},${cfg.pillDefaultOpacity / 100})`, color: cfg.pillDefaultText }}
                      className="rounded-full border px-3 py-1 text-xs font-medium"
                    >
                      {p.label}
                    </span>
                  )
                })}
              </div>

              <input
                readOnly
                value="your@email.com"
                style={{ borderColor: cfg.border, color: cfg.textMid, background: cfg.cardBg }}
                className="w-full rounded-lg border px-3 py-2 text-xs"
              />

              <button
                type="button"
                style={{ background: `rgba(${hexToRgb(cfg.button)},${cfg.buttonOpacity / 100})`, color: cfg.buttonText }}
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
