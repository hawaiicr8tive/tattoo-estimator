'use client'
import { useBranding } from '@/components/BrandingProvider'

export default function BookingCTA() {
  const { bookingUrl } = useBranding()

  return (
    <div className="rounded-2xl bg-[var(--brand-primary)] p-6 text-center">
      <h3 className="text-lg font-black mb-1 text-[var(--brand-primary-text)]">Ready to book your session?</h3>
      <p className="text-sm mb-4 text-[var(--brand-primary-text)] opacity-80">
        Book a free consultation — we&apos;ll nail down the design, placement, and final price together.
      </p>
      <a
        href={bookingUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block rounded-lg bg-white px-6 py-3 text-sm font-bold text-[var(--brand-primary)] hover:opacity-90 transition-opacity"
      >
        Book a Free Consultation →
      </a>
    </div>
  )
}
