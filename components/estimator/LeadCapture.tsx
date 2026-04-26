'use client'
import { useState } from 'react'
import { useBranding } from '@/components/BrandingProvider'
import { hexToRgb } from '@/lib/branding'
import EmailVerificationModal from './EmailVerificationModal'

interface Props {
  firstName: string
  email: string
  optedIn: boolean
  onFirstNameChange: (v: string) => void
  onEmailChange: (v: string) => void
  onOptedInChange: (v: boolean) => void
  onSubmit: (verificationCode: string) => Promise<{ ok: boolean; error?: string }>
  isSubmitting: boolean
}

export default function LeadCapture({
  firstName, email, optedIn,
  onFirstNameChange, onEmailChange, onOptedInChange,
  onSubmit, isSubmitting
}: Props) {
  const { button, buttonOpacity, buttonText } = useBranding()
  const buttonStyle: React.CSSProperties = {
    backgroundColor: `rgba(${hexToRgb(button)}, ${buttonOpacity / 100})`,
    color: buttonText,
  }
  const [errors, setErrors] = useState<{ firstName?: string; email?: string }>({})
  const [sendingCode, setSendingCode] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  function validate() {
    const e: typeof errors = {}
    if (!firstName.trim()) e.firstName = 'First name is required'
    if (!email.trim()) e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function sendCode(): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch('/api/send-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, firstName }),
      })
      const data = await res.json()
      if (!res.ok) return { ok: false, error: data.error || 'Failed to send code' }
      return { ok: true }
    } catch {
      return { ok: false, error: 'Network error — try again' }
    }
  }

  async function handleSubmit() {
    if (!validate()) return
    setSendingCode(true); setSendError(null)
    const result = await sendCode()
    setSendingCode(false)
    if (!result.ok) {
      setSendError(result.error || 'Failed to send verification code')
      return
    }
    setShowModal(true)
  }

  async function handleVerify(code: string) {
    return await onSubmit(code)
  }

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-center text-[var(--brand-text)]">Where should we send your estimate?</h2>
      <p className="text-center text-sm text-[var(--brand-text-mid)]">Just a name and email — we&apos;ll send a quick verification code to confirm.</p>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-[var(--brand-text)] mb-1">First Name</label>
          <input
            type="text"
            value={firstName}
            onChange={e => onFirstNameChange(e.target.value)}
            placeholder="Your first name"
            className="w-full rounded-lg border border-[var(--brand-border)] px-3 py-2.5 text-sm text-[var(--brand-text)] bg-[var(--brand-card)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
          />
          {errors.firstName && <p className="mt-1 text-xs text-red-600">{errors.firstName}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--brand-text)] mb-1">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={e => onEmailChange(e.target.value)}
            placeholder="your@email.com"
            className="w-full rounded-lg border border-[var(--brand-border)] px-3 py-2.5 text-sm text-[var(--brand-text)] bg-[var(--brand-card)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
          />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
        </div>

        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={optedIn}
            onChange={e => onOptedInChange(e.target.checked)}
            className="mt-0.5 rounded border-[var(--brand-border)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
          />
          <span className="text-xs text-[var(--brand-text-mid)]">Send me updates on flash deals and events</span>
        </label>
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={sendingCode || isSubmitting}
        style={buttonStyle}
        className="w-full rounded-lg py-3.5 text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-60 cursor-pointer"
      >
        {sendingCode ? 'Sending verification…' : isSubmitting ? 'Getting your estimate…' : 'Show My Estimate →'}
      </button>

      {sendError && <p className="text-center text-sm text-red-600">{sendError}</p>}

      {showModal && (
        <EmailVerificationModal
          email={email}
          onVerify={handleVerify}
          onCancel={() => setShowModal(false)}
          onResend={sendCode}
        />
      )}
    </div>
  )
}
