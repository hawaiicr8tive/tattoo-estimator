'use client'
import { useState, useEffect, useRef } from 'react'
import { useBranding } from '@/components/BrandingProvider'
import StyleSelector from '@/components/estimator/StyleSelector'
import PlacementSelector from '@/components/estimator/PlacementSelector'
import SizeSelector from '@/components/estimator/SizeSelector'
import ColorToggle from '@/components/estimator/ColorToggle'
import NotesField from '@/components/estimator/NotesField'
import LeadCapture from '@/components/estimator/LeadCapture'
import type { PlacementKey, TattooSize, StyleOption, Lead, Artist, PriceEstimate, XlConfig } from '@/lib/types'

const TOTAL_STEPS = 6

const DEFAULT_STYLES: StyleOption[] = [
  { id: 'fine-line',   label: 'Fine Line / Dotwork',          description: 'Delicate lines, intricate detail, minimal shading',     multiplier: 1.00 },
  { id: 'traditional', label: 'Traditional / Neo-Traditional', description: 'Bold outlines, classic imagery, rich color fills',      multiplier: 1.00 },
  { id: 'realism',     label: 'Realism & Portraits',           description: 'Photo-realistic detail, portraits, nature scenes',      multiplier: 1.30 },
  { id: 'polynesian',  label: 'Polynesian / Tribal',           description: 'Dense patterns, cultural motifs, high ink coverage',    multiplier: 1.15 },
  { id: 'geometric',   label: 'Geometric',                     description: 'Precise shapes, sacred geometry, ruler-straight lines', multiplier: 1.10 },
]

const TIER_LABELS: Record<number, string> = { 3: 'Featured Artist', 2: 'Senior Artist', 1: 'Artist' }

function ResultsView({ leadId, onReset }: { leadId: string; onReset: () => void }) {
  const { bookingUrl } = useBranding()
  const [lead, setLead] = useState<Lead | null>(null)
  const [allArtists, setAllArtists] = useState<Artist[]>([])
  const [xlConfig, setXlConfig] = useState<XlConfig | undefined>(undefined)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`/api/submit-lead?id=${encodeURIComponent(leadId)}`).then(r => r.json()),
      fetch('/api/artists').then(r => r.json()),
      fetch('/api/xl-config').then(r => r.json()),
    ])
      .then(([leadData, artistsData, xlData]) => {
        if (!leadData.error) setLead(leadData)
        if (Array.isArray(artistsData)) setAllArtists(artistsData)
        if (xlData && typeof xlData === 'object') setXlConfig(xlData as XlConfig)
      })
      .finally(() => setLoading(false))
  }, [leadId])

  if (loading) {
    return <p className="text-center py-10 text-[var(--brand-text-mid)]">Loading your estimate…</p>
  }

  if (!lead) {
    return <p className="text-center py-6 text-red-600">Could not load estimate. Please try again.</p>
  }

  const estimate: PriceEstimate = {
    priceRange: { min: lead.price_min, max: lead.price_max },
    timeRange: { min: lead.hours_min, max: lead.hours_max },
    disclaimer: 'Final pricing confirmed at consultation. This is a guide, not a quote.',
    isConsultationOnly: lead.size === 'xl',
  }

  const matchedArtists = (lead.matched_artists ?? [])
    .map(id => allArtists.find(a => a.id === id))
    .filter((a): a is Artist => Boolean(a))

  return (
    <div className="space-y-4">
      {/* Price card */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
        <h2 className="text-lg font-bold text-[var(--brand-text)] mb-0.5">
          {lead.first_name ? `${lead.first_name}'s Estimate` : 'Your Estimate'}
        </h2>
        <p className="text-xs text-[var(--brand-text-mid)] mb-4">Based on your selections — not a final quote</p>

        {estimate.isConsultationOnly && xlConfig ? (
          <div className="rounded-xl bg-[var(--brand-primary-5)] border border-[var(--brand-primary-20)] p-4">
            <p className="text-sm font-bold text-[var(--brand-primary)] text-center mb-3">Custom / Large Piece</p>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div className="rounded-lg bg-[var(--brand-bg)] p-2.5 text-center">
                <p className="text-xs font-medium text-[var(--brand-text-mid)] uppercase tracking-wide mb-0.5">Half Day</p>
                <p className="text-base font-black text-[var(--brand-text)]">
                  ${xlConfig.halfDayRate.min.toLocaleString()} – ${xlConfig.halfDayRate.max.toLocaleString()}
                </p>
              </div>
              <div className="rounded-lg bg-[var(--brand-bg)] p-2.5 text-center">
                <p className="text-xs font-medium text-[var(--brand-text-mid)] uppercase tracking-wide mb-0.5">Full Day</p>
                <p className="text-base font-black text-[var(--brand-text)]">
                  ${xlConfig.fullDayRate.min.toLocaleString()} – ${xlConfig.fullDayRate.max.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="rounded-lg bg-white border border-gray-100 p-2.5 text-center">
              <p className="text-xs font-medium text-[var(--brand-text-mid)] uppercase tracking-wide mb-0.5">Estimated Sessions</p>
              <p className="text-base font-black text-[var(--brand-text)]">
                {xlConfig.sessionsRange.min === xlConfig.sessionsRange.max
                  ? `${xlConfig.sessionsRange.min} ${xlConfig.sessionsRange.min === 1 ? 'session' : 'sessions'}`
                  : `${xlConfig.sessionsRange.min}–${xlConfig.sessionsRange.max} sessions`}
              </p>
            </div>
          </div>
        ) : estimate.isConsultationOnly ? (
          <div className="rounded-xl bg-[var(--brand-primary-5)] border border-[var(--brand-primary-20)] p-4 text-center">
            <p className="text-sm font-bold text-[var(--brand-primary)] mb-1">Custom / Large Piece</p>
            <p className="text-3xl font-black text-[var(--brand-text)]">
              ${estimate.priceRange.min.toLocaleString()} – ${estimate.priceRange.max.toLocaleString()}
            </p>
            <p className="text-xs text-[var(--brand-text-mid)] mt-1">
              {estimate.timeRange.min}–{estimate.timeRange.max} hours · final pricing at consultation
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="rounded-xl bg-[var(--brand-bg)] p-3 text-center">
              <p className="text-xs font-medium text-[var(--brand-text-mid)] uppercase tracking-wide mb-1">Estimated Cost</p>
              <p className="text-xl font-black text-[var(--brand-text)]">
                ${estimate.priceRange.min.toLocaleString()} – ${estimate.priceRange.max.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl bg-[var(--brand-bg)] p-3 text-center">
              <p className="text-xs font-medium text-[var(--brand-text-mid)] uppercase tracking-wide mb-1">Session Time</p>
              <p className="text-xl font-black text-[var(--brand-text)]">
                {estimate.timeRange.min}–{estimate.timeRange.max}h
              </p>
            </div>
          </div>
        )}
        <p className="text-xs text-[var(--brand-text-mid)] text-center mt-2">
          {estimate.isConsultationOnly && xlConfig ? xlConfig.disclaimer : estimate.disclaimer}
        </p>
      </div>

      {/* Matched artists */}
      {matchedArtists.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-[var(--brand-text)] uppercase tracking-wide mb-2">
            {matchedArtists.length === 1 ? 'Artist for Your Style' : 'Artists for Your Style'}
          </h3>
          <div className="space-y-2">
            {matchedArtists.map((artist, i) => (
              <div key={artist.id} className="rounded-xl bg-white border border-gray-100 shadow-sm p-3 flex items-start gap-3">
                <div className="w-11 h-11 rounded-full bg-[var(--brand-bg)] border border-gray-200 shrink-0 overflow-hidden flex items-center justify-center text-xl">
                  {artist.photo
                    ? <img src={artist.photo} alt={artist.name} className="w-full h-full object-cover" />
                    : <span>🎨</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-[var(--brand-text)]">{artist.name}</span>
                    {i === 0 && (
                      <span className="rounded-full bg-[var(--brand-primary)] px-2 py-0.5 text-xs font-bold text-[var(--brand-primary-text)]">Best Match</span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--brand-primary)] font-medium mb-1">{TIER_LABELS[artist.tier]}</p>
                  <p className="text-xs text-[var(--brand-text-mid)] line-clamp-2 mb-2">{artist.bio}</p>
                  <a href={artist.bookingUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-block rounded-lg bg-[var(--brand-primary)] px-3 py-1 text-xs font-bold text-[var(--brand-primary-text)] hover:opacity-90">
                    Book with {artist.name.split(' ')[0]}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Booking CTA */}
      <div className="rounded-2xl bg-[var(--brand-primary)] p-5 text-center">
        <h3 className="text-base font-black mb-1 text-[var(--brand-primary-text)]">Ready to book your session?</h3>
        <p className="text-sm mb-3 text-[var(--brand-primary-text)] opacity-80">
          Book a free consultation — we'll nail down the design, placement, and final price together.
        </p>
        <a href={bookingUrl} target="_blank" rel="noopener noreferrer"
          className="inline-block rounded-lg bg-white px-5 py-2.5 text-sm font-bold text-[var(--brand-primary)] hover:opacity-90">
          Book a Free Consultation →
        </a>
      </div>

      <p className="text-center text-xs text-[var(--brand-text-mid)]">We've sent a copy to {lead.email}</p>

      <button type="button" onClick={onReset}
        className="block mx-auto text-xs text-[var(--brand-text-mid)] underline hover:text-[var(--brand-text)] cursor-pointer">
        ← Start a new estimate
      </button>
    </div>
  )
}

export default function EmbedPage() {
  const containerRef = useRef<HTMLDivElement>(null)

  const [step, setStep] = useState(1)
  const [styles, setStyles] = useState<StyleOption[]>(DEFAULT_STYLES)
  const [style, setStyle] = useState<string | null>(null)
  const [placement, setPlacement] = useState<PlacementKey | null>(null)
  const [size, setSize] = useState<TattooSize | null>(null)
  const [isColor, setIsColor] = useState<boolean | null>(null)
  const [notes, setNotes] = useState('')
  const [firstName, setFirstName] = useState('')
  const [email, setEmail] = useState('')
  const [optedIn, setOptedIn] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultId, setResultId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/styles')
      .then(r => r.json())
      .then((data: StyleOption[]) => { if (Array.isArray(data) && data.length > 0) setStyles(data) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    function sendHeight() {
      const h = document.documentElement.scrollHeight
      window.parent.postMessage({ type: 'tattoo-estimator:resize', height: h }, '*')
    }
    const ro = new ResizeObserver(sendHeight)
    ro.observe(document.documentElement)
    sendHeight()
    return () => ro.disconnect()
  }, [])

  function advance() { setStep(s => s + 1) }
  function handleBack() { setStep(s => Math.max(1, s - 1)) }

  async function handleSubmit() {
    setIsSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/submit-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ style, placement, size, isColor, notes, firstName, email, optedIn }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Submission failed')
      setResultId(data.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleReset() {
    setStep(1); setStyle(null); setPlacement(null); setSize(null)
    setIsColor(null); setNotes(''); setFirstName(''); setEmail('')
    setOptedIn(false); setError(null); setResultId(null)
  }

  const progress = ((step - 1) / TOTAL_STEPS) * 100

  return (
    <div ref={containerRef} className="bg-white px-4 py-6">
      <div className="w-full max-w-md mx-auto">

        {/* Header */}
        <div className="mb-5 text-center">
          <h1 className="text-xl font-black tracking-tight text-[var(--brand-text)]">Tattoolicious</h1>
          <p className="text-xs text-[var(--brand-text-mid)] mt-0.5">Price Estimator</p>
        </div>

        {resultId ? (
          <ResultsView leadId={resultId} onReset={handleReset} />
        ) : (
          <>
            {/* Progress */}
            <div className="mb-4 h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
              <div className="h-full rounded-full bg-[var(--brand-primary)] transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-[var(--brand-text-mid)] text-right mb-4">Step {step} of {TOTAL_STEPS}</p>

            {/* Step card */}
            <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-5">
              {step === 1 && <StyleSelector value={style} styles={styles} onChange={v => { setStyle(v); advance() }} />}
              {step === 2 && <PlacementSelector value={placement} onChange={v => { setPlacement(v); advance() }} />}
              {step === 3 && <SizeSelector value={size} onChange={v => { setSize(v); advance() }} />}
              {step === 4 && <ColorToggle value={isColor} onChange={v => { setIsColor(v); advance() }} />}
              {step === 5 && <NotesField value={notes} onChange={setNotes} onSkip={advance} />}
              {step === 6 && (
                <LeadCapture
                  firstName={firstName} email={email} optedIn={optedIn}
                  onFirstNameChange={setFirstName} onEmailChange={setEmail}
                  onOptedInChange={setOptedIn} onSubmit={handleSubmit} isSubmitting={isSubmitting}
                />
              )}
              {error && <p className="mt-3 text-sm text-center text-red-600">{error}</p>}
            </div>

            {/* Back / Next */}
            <div className="mt-3 flex items-center justify-between">
              {step > 1 ? (
                <button type="button" onClick={handleBack} disabled={isSubmitting}
                  className="text-sm text-[var(--brand-text-mid)] hover:text-[var(--brand-text)] disabled:opacity-40 cursor-pointer">
                  ← Back
                </button>
              ) : <span />}
              {step === 5 && (
                <button type="button" onClick={advance}
                  className="rounded-lg bg-[var(--brand-primary)] px-5 py-2.5 text-sm font-bold text-[var(--brand-primary-text)] hover:opacity-90 cursor-pointer">
                  Next →
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
