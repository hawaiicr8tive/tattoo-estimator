'use client'

import { useEffect, useState } from 'react'

export interface LightboxImage {
  url: string
  prompt: string
  createdAt: string
  model: string
}

interface Props {
  images: LightboxImage[]
  activeIndex: number | null
  onClose: () => void
  onNavigate: (newIndex: number) => void
  /** Optional handler invoked when the user clicks "Analyze" in the lightbox
   * toolbar. When omitted, the button is hidden. */
  onAnalyze?: (image: LightboxImage) => void
  /** True while the analyze request is in flight so the button can show a
   * loading state. */
  analyzing?: boolean
}

/**
 * Click an image in the FusionLab grid to open this lightbox at full size.
 * Keyboard: ESC closes, ← / → cycle. Click backdrop to close.
 * "Show prompt" toggles the prompt that produced the image (useful for tuning
 * descriptors). "Open original" opens the raw URL in a new tab — handy for
 * download or sharing.
 */
export default function ImageLightbox({ images, activeIndex, onClose, onNavigate, onAnalyze, analyzing }: Props) {
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    if (activeIndex === null) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') onNavigate((activeIndex! - 1 + images.length) % images.length)
      else if (e.key === 'ArrowRight') onNavigate((activeIndex! + 1) % images.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeIndex, images.length, onClose, onNavigate])

  if (activeIndex === null) return null
  const img = images[activeIndex]
  if (!img) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Flash design preview"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      {/* Stop propagation on the inner panel so clicks inside don't close */}
      <div
        className="relative max-w-4xl w-full max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between text-xs text-white/80 mb-2 gap-3">
          <div className="min-w-0">
            <span>{activeIndex + 1} / {images.length}</span>
            <span className="ml-3">{img.model}</span>
            <span className="ml-3">{new Date(img.createdAt).toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setShowPrompt(p => !p)}
              className="underline hover:text-white"
            >
              {showPrompt ? 'Hide prompt' : 'Show prompt'}
            </button>
            {onAnalyze && (
              <button
                type="button"
                onClick={() => onAnalyze(img)}
                disabled={analyzing}
                className="underline hover:text-white disabled:opacity-50"
                title="Use GPT-5 Vision to reverse-engineer a prompt from this image"
              >
                {analyzing ? 'Analyzing…' : '🔍 Analyze with GPT-5'}
              </button>
            )}
            <a
              href={img.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-white"
            >
              Open original ↗
            </a>
            <button
              type="button"
              onClick={onClose}
              className="rounded bg-white/10 hover:bg-white/20 w-9 h-9 flex items-center justify-center touch-manipulation"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="relative flex items-center justify-center bg-white rounded-lg overflow-hidden">
          {images.length > 1 && (
            <button
              type="button"
              onClick={() => onNavigate((activeIndex - 1 + images.length) % images.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 hover:bg-black/80 text-white w-11 h-11 flex items-center justify-center text-2xl z-10 touch-manipulation"
              aria-label="Previous"
            >
              ‹
            </button>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={img.url}
            alt={`Flash design ${activeIndex + 1} of ${images.length}`}
            className="max-w-full max-h-[80vh] object-contain"
          />
          {images.length > 1 && (
            <button
              type="button"
              onClick={() => onNavigate((activeIndex + 1) % images.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 hover:bg-black/80 text-white w-11 h-11 flex items-center justify-center text-2xl z-10 touch-manipulation"
              aria-label="Next"
            >
              ›
            </button>
          )}
        </div>

        {showPrompt && (
          <div className="mt-2 max-h-32 overflow-auto rounded bg-black/40 text-white/90 text-xs leading-relaxed p-3">
            {img.prompt}
          </div>
        )}
      </div>
    </div>
  )
}
