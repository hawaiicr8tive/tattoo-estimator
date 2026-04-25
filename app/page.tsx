'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useBranding } from '@/components/BrandingProvider'
import { hexToRgb } from '@/lib/branding'
import StyleSelector from '@/components/estimator/StyleSelector'
import PlacementSelector from '@/components/estimator/PlacementSelector'
import SizeSelector from '@/components/estimator/SizeSelector'
import ColorToggle from '@/components/estimator/ColorToggle'
import NotesField from '@/components/estimator/NotesField'
import LeadCapture from '@/components/estimator/LeadCapture'
import type { PlacementKey, TattooSize, StyleOption } from '@/lib/types'

const TOTAL_STEPS = 6

const DEFAULT_STYLES: StyleOption[] = [
  { id: 'fine-line',   label: 'Fine Line / Dotwork',           description: 'Delicate lines, intricate detail, minimal shading',     multiplier: 1.00 },
  { id: 'traditional', label: 'Traditional / Neo-Traditional',  description: 'Bold outlines, classic imagery, rich color fills',      multiplier: 1.00 },
  { id: 'realism',     label: 'Realism & Portraits',            description: 'Photo-realistic detail, portraits, nature scenes',      multiplier: 1.30 },
  { id: 'polynesian',  label: 'Polynesian / Tribal',            description: 'Dense patterns, cultural motifs, high ink coverage',    multiplier: 1.15 },
  { id: 'geometric',   label: 'Geometric',                      description: 'Precise shapes, sacred geometry, ruler-straight lines', multiplier: 1.10 },
]

export default function EstimatorPage() {
  const router = useRouter()
  const { button, buttonOpacity, buttonText } = useBranding()
  const buttonStyle: React.CSSProperties = {
    backgroundColor: `rgba(${hexToRgb(button)}, ${buttonOpacity / 100})`,
    color: buttonText,
  }
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

  useEffect(() => {
    fetch('/api/styles')
      .then(r => r.json())
      .then((data: StyleOption[]) => { if (Array.isArray(data) && data.length > 0) setStyles(data) })
      .catch(() => {})
  }, [])

  function advance() { setStep(s => s + 1) }
  function handleBack() { setStep(s => Math.max(1, s - 1)) }

  async function handleSubmit(verificationCode: string): Promise<{ ok: boolean; error?: string }> {
    setIsSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/submit-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ style, placement, size, isColor, notes, firstName, email, optedIn, verificationCode }),
      })
      const data = await res.json()
      if (!res.ok) {
        setIsSubmitting(false)
        return { ok: false, error: data.error || 'Submission failed' }
      }
      router.push(`/results?id=${data.id}`)
      return { ok: true }
    } catch (e) {
      setIsSubmitting(false)
      const msg = e instanceof Error ? e.message : 'Something went wrong'
      setError(msg)
      return { ok: false, error: msg }
    }
  }

  const progress = ((step - 1) / TOTAL_STEPS) * 100

  return (
    <div className="min-h-screen bg-[var(--brand-bg)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-black tracking-tight text-[var(--brand-text)]">Tattoolicious</h1>
          <p className="text-sm text-[var(--brand-text-mid)] mt-1">Price Estimator</p>
        </div>

        <div className="mb-5 h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--brand-primary)] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-[var(--brand-text-mid)] text-right mb-5">Step {step} of {TOTAL_STEPS}</p>

        <div className="rounded-2xl bg-[var(--brand-card)] shadow-sm border border-[var(--brand-border)] p-6">
          {step === 1 && (
            <StyleSelector value={style} styles={styles} onChange={v => { setStyle(v); advance() }} />
          )}
          {step === 2 && (
            <PlacementSelector value={placement} onChange={v => { setPlacement(v); advance() }} />
          )}
          {step === 3 && (
            <SizeSelector value={size} onChange={v => { setSize(v); advance() }} />
          )}
          {step === 4 && (
            <ColorToggle value={isColor} onChange={v => { setIsColor(v); advance() }} />
          )}
          {step === 5 && (
            <NotesField value={notes} onChange={setNotes} onSkip={advance} />
          )}
          {step === 6 && (
            <LeadCapture
              firstName={firstName} email={email} optedIn={optedIn}
              onFirstNameChange={setFirstName} onEmailChange={setEmail}
              onOptedInChange={setOptedIn} onSubmit={handleSubmit} isSubmitting={isSubmitting}
            />
          )}
          {error && <p className="mt-4 text-sm text-center text-red-600">{error}</p>}
        </div>

        <div className="mt-4 flex items-center justify-between">
          {step > 1 ? (
            <button type="button" onClick={handleBack} disabled={isSubmitting}
              className="text-sm text-[var(--brand-text-mid)] hover:text-[var(--brand-text)] disabled:opacity-40 cursor-pointer">
              ← Back
            </button>
          ) : <span />}
          {step === 5 && (
            <button type="button" onClick={advance}
              style={buttonStyle}
              className="rounded-lg px-5 py-2.5 text-sm font-bold hover:opacity-90 cursor-pointer">
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
