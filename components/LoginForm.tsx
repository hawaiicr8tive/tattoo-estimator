'use client'

import { useState } from 'react'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Email is optional: leaving it blank signs in the built-in
        // ADMIN_PASSWORD owner, which is how this form worked before
        // per-user accounts existed.
        body: JSON.stringify({ email: email.trim() || undefined, password: pw }),
      })
      if (res.ok) {
        // Reload so the server-rendered layout sees the new cookie.
        window.location.reload()
      } else {
        const data = await res.json()
        setError(data.error ?? 'Incorrect email or password')
      }
    } catch {
      setError('Connection error — try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--brand-bg)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-sm border border-gray-100 p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--brand-primary)]/10 mb-3">
            <span className="text-[var(--brand-primary)] text-xl">🔒</span>
          </div>
          <h1 className="text-xl font-black text-[#0A0A0A]">Style Prediction Model</h1>
          <p className="text-sm text-[#555555] mt-1">Sign in to continue</p>
        </div>
        <input
          type="email"
          value={email}
          onChange={e => { setEmail(e.target.value); setError(null) }}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          placeholder="Email"
          autoComplete="username"
          autoFocus
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-[#0A0A0A] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent mb-2"
        />
        <input
          type="password"
          value={pw}
          onChange={e => { setPw(e.target.value); setError(null) }}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          placeholder="Password"
          autoComplete="current-password"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-[#0A0A0A] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent mb-3"
        />
        {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
        <button
          type="button"
          onClick={handleLogin}
          disabled={loading}
          className="w-full rounded-lg bg-[var(--brand-primary)] py-3 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60 cursor-pointer"
        >
          {loading ? 'Checking…' : 'Sign In →'}
        </button>
      </div>
    </div>
  )
}
