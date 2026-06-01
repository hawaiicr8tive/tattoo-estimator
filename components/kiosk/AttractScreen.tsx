'use client'
import { useEffect, useState } from 'react'
import KioskImage from './KioskImage'

/**
 * Idle "attract" loop. Auto-advances through flash art with a slow
 * Ken Burns drift until someone touches the screen. Any pointer dismisses.
 */
export default function AttractScreen({
  images,
  shopName,
  onDismiss,
  intervalMs = 4500,
}: {
  images: string[]
  shopName: string
  onDismiss: () => void
  intervalMs?: number
}) {
  const [i, setI] = useState(0)

  useEffect(() => {
    if (images.length <= 1) return
    const t = setInterval(() => setI(n => (n + 1) % images.length), intervalMs)
    return () => clearInterval(t)
  }, [images.length, intervalMs])

  return (
    <div
      className="absolute inset-0 z-30 overflow-hidden bg-black"
      onPointerDown={onDismiss}
      role="button"
      aria-label="Tap to explore"
    >
      {images.length > 0 && (
        <KioskImage
          key={i}
          src={images[i]}
          alt={shopName}
          eager
          className="kiosk-kenburns absolute inset-0 h-full w-full object-cover"
        />
      )}

      {/* Darken + invitation */}
      <div className="absolute inset-0 bg-black/40" />
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-28 text-center">
        <h1 className="px-8 text-5xl font-black leading-tight text-white drop-shadow-lg">
          {shopName}
        </h1>
        <p className="mt-3 text-lg font-medium text-white/80">
          Browse our flash &amp; artists
        </p>
        <div className="kiosk-pulse mt-8 rounded-full border-2 border-white/80 px-8 py-3 text-lg font-bold text-white">
          Tap to start
        </div>
      </div>
    </div>
  )
}
