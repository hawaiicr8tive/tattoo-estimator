'use client'

export default function BookingCTA() {
  return (
    <div className="rounded-2xl bg-[#7B0000] p-6 text-center text-white">
      <h3 className="text-lg font-black mb-1">Ready to book your session?</h3>
      <p className="text-sm text-white/80 mb-4">
        Book a free consultation — we'll nail down the design, placement, and final price together.
      </p>
      <a
        href="https://tattoolicious.com/booking"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block rounded-lg bg-white px-6 py-3 text-sm font-bold text-[#7B0000] hover:opacity-90 transition-opacity"
      >
        Book a Free Consultation →
      </a>
    </div>
  )
}
