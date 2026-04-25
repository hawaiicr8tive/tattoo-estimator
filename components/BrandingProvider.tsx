'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { BRANDING_DEFAULTS, hexToRgb } from '@/lib/branding'
import type { BrandingConfig } from '@/lib/branding'

interface BrandingCtx {
  bookingUrl: string
  primary: string
  button: string
  buttonOpacity: number
  buttonText: string
  pillDefaultBg: string
  pillDefaultOpacity: number
  pillDefaultText: string
  pillBg: string
  pillOpacity: number
  pillText: string
}

const BrandingContext = createContext<BrandingCtx>({
  bookingUrl:         BRANDING_DEFAULTS.bookingUrl,
  primary:            BRANDING_DEFAULTS.primary,
  button:             BRANDING_DEFAULTS.button,
  buttonOpacity:      BRANDING_DEFAULTS.buttonOpacity,
  buttonText:         BRANDING_DEFAULTS.buttonText,
  pillDefaultBg:      BRANDING_DEFAULTS.pillDefaultBg,
  pillDefaultOpacity: BRANDING_DEFAULTS.pillDefaultOpacity,
  pillDefaultText:    BRANDING_DEFAULTS.pillDefaultText,
  pillBg:             BRANDING_DEFAULTS.pillBg,
  pillOpacity:        BRANDING_DEFAULTS.pillOpacity,
  pillText:           BRANDING_DEFAULTS.pillText,
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
  root.style.setProperty('--brand-button',       b.button ?? b.primary)
  root.style.setProperty('--brand-button-text',  b.buttonText ?? b.primaryText)
  const pillRgb     = hexToRgb(b.pillBg ?? b.primary)
  const pillOpacity = (b.pillOpacity ?? 100) / 100
  root.style.setProperty('--brand-pill-rgb',     pillRgb)
  root.style.setProperty('--brand-pill-opacity', String(pillOpacity))
  root.style.setProperty('--brand-pill-text',    b.pillText ?? b.primaryText)
  root.style.setProperty('--brand-bg',           b.background)
  root.style.setProperty('--brand-card',         b.cardBg)
  root.style.setProperty('--brand-text',         b.textDark)
  root.style.setProperty('--brand-text-mid',     b.textMid)
  root.style.setProperty('--brand-border',       b.border)
}

export default function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [ctx, setCtx] = useState<BrandingCtx>({
    bookingUrl:         BRANDING_DEFAULTS.bookingUrl,
    primary:            BRANDING_DEFAULTS.primary,
    button:             BRANDING_DEFAULTS.button,
    buttonOpacity:      BRANDING_DEFAULTS.buttonOpacity,
    buttonText:         BRANDING_DEFAULTS.buttonText,
    pillDefaultBg:      BRANDING_DEFAULTS.pillDefaultBg,
    pillDefaultOpacity: BRANDING_DEFAULTS.pillDefaultOpacity,
    pillDefaultText:    BRANDING_DEFAULTS.pillDefaultText,
    pillBg:             BRANDING_DEFAULTS.pillBg,
    pillOpacity:        BRANDING_DEFAULTS.pillOpacity,
    pillText:           BRANDING_DEFAULTS.pillText,
  })

  useEffect(() => {
    fetch('/api/branding')
      .then(r => r.json())
      .then((cfg: Partial<BrandingConfig>) => {
        applyBranding(cfg)
        setCtx({
          bookingUrl:         cfg.bookingUrl         ?? BRANDING_DEFAULTS.bookingUrl,
          primary:            cfg.primary            ?? BRANDING_DEFAULTS.primary,
          button:             cfg.button             ?? cfg.primary ?? BRANDING_DEFAULTS.button,
          buttonOpacity:      cfg.buttonOpacity      ?? BRANDING_DEFAULTS.buttonOpacity,
          buttonText:         cfg.buttonText         ?? cfg.primaryText ?? BRANDING_DEFAULTS.buttonText,
          pillDefaultBg:      cfg.pillDefaultBg      ?? cfg.cardBg ?? BRANDING_DEFAULTS.pillDefaultBg,
          pillDefaultOpacity: cfg.pillDefaultOpacity ?? BRANDING_DEFAULTS.pillDefaultOpacity,
          pillDefaultText:    cfg.pillDefaultText    ?? cfg.textDark ?? BRANDING_DEFAULTS.pillDefaultText,
          pillBg:             cfg.pillBg             ?? BRANDING_DEFAULTS.pillBg,
          pillOpacity:        cfg.pillOpacity        ?? BRANDING_DEFAULTS.pillOpacity,
          pillText:           cfg.pillText           ?? BRANDING_DEFAULTS.pillText,
        })
      })
      .catch(() => {})
  }, [])

  return <BrandingContext.Provider value={ctx}>{children}</BrandingContext.Provider>
}
