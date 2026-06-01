'use client'
import { useState } from 'react'

// Plain <img> (not next/image) on purpose: the kiosk loads remote Supabase
// URLs and locally-controlled sizes, and we want predictable lazy/eager
// behaviour on the device's WebView rather than the framework's loader.
// Real deployments should serve pre-sized WebP/AVIF — see components/kiosk/README.
export default function KioskImage({
  src,
  alt,
  eager = false,
  className = '',
}: {
  src: string
  alt: string
  eager?: boolean
  className?: string
}) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div
        className={`flex items-center justify-center bg-[var(--brand-primary)] text-white/80 ${className}`}
        aria-label={alt}
      >
        <span className="px-6 text-center text-lg font-semibold">{alt}</span>
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- intentional: kiosk controls sizing and WebView load behaviour; see note above
    <img
      src={src}
      alt={alt}
      draggable={false}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailed(true)}
      className={className}
    />
  )
}
