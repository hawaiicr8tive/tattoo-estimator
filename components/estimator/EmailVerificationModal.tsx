'use client'
import { useState, useEffect, useRef } from 'react'
import { useBranding } from '@/components/BrandingProvider'
import { hexToRgb } from '@/lib/branding'

interface Props {
  email: string
  onVerify: (code: string) => Promise<{ ok: boolean; error?: string }>
  onCancel: () => void
  onResend: () => Promise<{ ok: boolean; error?: string }>
}

export default function EmailVerificationModal({ email, onVerify, onCancel, onResend }: Props) {
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { button, buttonOpacity, buttonText } = useBranding()
  const buttonStyle: React.CSSProperties = {
    backgroundColor: `rgba(${hexToRgb(button)}, ${buttonOpacity / 100})`,
    color: buttonText,
  }

  useEffect(() => { inputRef.current?.focus() }, [])

  async function handleVerify() {
    if (code.length !== 4) {
      setError('Enter the 4-digit code')
      return
    }
    setVerifying(true); setError(null); setInfo(null)
    const result = await onVerify(code)
    if (!result.ok) {
      setError(result.error || 'Incorrect code')
      setVerifying(false)
    }
    // On success, parent navigates away — no need to reset state
  }

  async function handleResend() {
    setResending(true); setError(null); setInfo(null)
    const result = await onResend()
    if (result.ok) {
      setInfo('A new code has been sent.')
      setCode('')
      inputRef.current?.focus()
    } else {
      setError(result.error || 'Could not resend the code.')
    }
    setResending(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onCancel}>
      <div
        className="w-full max-w-sm rounded-2xl bg-[var(--brand-card)] border border-[var(--brand-border)] p-6 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-[var(--brand-text)] mb-1">Check your email</h2>
        <p className="text-sm text-[var(--brand-text-mid)] mb-4">
          We just sent a 4-digit code to <strong>{email}</strong>. Enter it below to see your estimate.
        </p>

        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          value={code}
          onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 4)); setError(null); setInfo(null) }}
          onKeyDown={e => { if (e.key === 'Enter') handleVerify() }}
          placeholder="• • • •"
          className="w-full rounded-lg border border-[var(--brand-border)] px-3 py-3 text-center text-2xl font-mono tracking-[0.5em] text-[var(--brand-text)] bg-[var(--brand-card)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
        />

        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        {info  && <p className="mt-2 text-xs text-green-700">{info}</p>}

        <button
          type="button"
          onClick={handleVerify}
          disabled={verifying || code.length !== 4}
          style={buttonStyle}
          className="mt-4 w-full rounded-lg py-3 text-sm font-bold disabled:opacity-50 cursor-pointer hover:opacity-90 transition-opacity"
        >
          {verifying ? 'Verifying…' : 'Verify & Get Estimate →'}
        </button>

        <div className="mt-3 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={onCancel}
            className="text-[var(--brand-text-mid)] hover:text-[var(--brand-text)] underline cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="text-[var(--brand-primary)] hover:opacity-80 underline cursor-pointer disabled:opacity-50"
          >
            {resending ? 'Sending…' : 'Resend code'}
          </button>
        </div>
      </div>
    </div>
  )
}
