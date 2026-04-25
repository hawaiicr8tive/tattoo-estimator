'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { BRANDING_DEFAULTS, hexToRgb } from '@/lib/branding'
import type { BrandingConfig } from '@/lib/branding'

interface BrandingCtx {
  bookingUrl: string
}

const BrandingContext = createContext<BrandingCtx>({
  bookingUrl: BRANDING_DEFAULTS.bookingUrl,
})

export function useBranding() { return useContext(BrandingContext) }

export function applyBranding(cfg: Partial<BrandingConfig>) {
  const b = { ...BRANDING_DEFAULTS, ...cfg }
  const rgb = hexToRgb(b.primary)
  const root = document.documentElement
  root.style.setProperty('--brand-primary',      b.primary)
  root.style.setProperty('--brand-primary-rgb',  rgb)
  root.style.setProperty('--brand-primary-5',    `rgba(${rgb},0.05)`)
  root.style.setProperty('--brand-primary-10',   `rgba(${rgb},0.10)`)
  root.style.setProperty('--brand-primary-20',   `rgba(${rgb},0.20)`)
  root.style.setProperty('--brand-primary-50',   `rgba(${rgb},0.50)`)
  root.style.setProperty('--brand-primary-text', b.primaryText)
  root.style.setProperty('--brand-bg',           b.background)
  root.style.setProperty('--brand-card',         b.cardBg)
  root.style.setProperty('--brand-text',         b.textDark)
  root.style.setProperty('--brand-text-mid',     b.textMid)
  root.style.setProperty('--brand-border',       b.border)
}

export default function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [ctx, setCtx] = useState<BrandingCtx>({ bookingUrl: BRANDING_DEFAULTS.bookingUrl })

  useEffect(() => {
    fetch('/api/branding')
      .then(r => r.json())
      .then((cfg: Partial<BrandingConfig>) => {
        applyBranding(cfg)
        setCtx({ bookingUrl: cfg.bookingUrl ?? BRANDING_DEFAULTS.bookingUrl })
      })
      .catch(() => {})
  }, [])

  return <BrandingContext.Provider value={ctx}>{children}</BrandingContext.Provider>
}
