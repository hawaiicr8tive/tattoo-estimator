'use client'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import PriceCard from '@/components/results/PriceCard'
import ArtistCard from '@/components/results/ArtistCard'
import BookingCTA from '@/components/results/BookingCTA'
import type { Lead, Artist, PriceEstimate, XlConfig } from '@/lib/types'

function ResultsContent() {
  const params = useSearchParams()
  const id = params.get('id')
  const [lead, setLead] = useState<Lead | null>(null)
  const [allArtists, setAllArtists] = useState<Artist[]>([])
  const [xlConfig, setXlConfig] = useState<XlConfig | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      setError('No estimate ID provided.')
      setLoading(false)
      return
    }
    Promise.all([
      fetch(`/api/submit-lead?id=${encodeURIComponent(id)}`).then(r => r.json()),
      fetch('/api/artists').then(r => r.json()),
      fetch('/api/xl-config').then(r => r.json()),
    ])
      .then(([leadData, artistsData, xlData]) => {
        if (leadData.error) throw new Error(leadData.error)
        setLead(leadData)
        if (Array.isArray(artistsData)) setAllArtists(artistsData)
        if (xlData && typeof xlData === 'object') setXlConfig(xlData as XlConfig)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--brand-bg)] flex items-center justify-center">
        <p className="text-[var(--brand-text-mid)]">Loading your estimate…</p>
      </div>
    )
  }

  if (error || !lead) {
    return (
      <div className="min-h-screen bg-[var(--brand-bg)] flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-[var(--brand-primary)] font-bold mb-2">Estimate not found</p>
          <p className="text-sm text-[var(--brand-text-mid)]">{error}</p>
          <a href="/" className="mt-4 inline-block text-sm text-[var(--brand-primary)] underline">Start over</a>
        </div>
      </div>
    )
  }

  const estimate: PriceEstimate = {
    priceRange: { min: lead.price_min, max: lead.price_max },
    timeRange: { min: lead.hours_min, max: lead.hours_max },
    disclaimer: 'Final pricing confirmed at consultation. This is a guide, not a quote.',
    isConsultationOnly: lead.size === 'xl',
  }

  const matchedArtistIds: string[] = lead.matched_artists ?? []
  const matchedArtists = matchedArtistIds
    .map(aid => allArtists.find(a => a.id === aid))
    .filter((a): a is Artist => Boolean(a))

  return (
    <div className="min-h-screen bg-[var(--brand-bg)] px-4 py-10">
      <div className="mx-auto w-full max-w-md space-y-5">
        <div className="text-center">
          <h1 className="text-2xl font-black tracking-tight text-[var(--brand-text)]">Tattoolicious</h1>
          <p className="text-sm text-[var(--brand-text-mid)] mt-1">Your Estimate</p>
        </div>

        <PriceCard estimate={estimate} firstName={lead.first_name} xlConfig={xlConfig} />

        {matchedArtists.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-[var(--brand-text)] uppercase tracking-wide mb-3">
              {matchedArtists.length === 1 ? 'Artist for Your Style' : 'Artists for Your Style'}
            </h2>
            <div className="space-y-3">
              {matchedArtists.map((artist, i) => (
                <ArtistCard key={artist.id} artist={artist} rank={i} />
              ))}
            </div>
          </div>
        )}

        <BookingCTA />

        <p className="text-center text-xs text-[var(--brand-text-mid)]">
          We've sent a copy to {lead.email}
        </p>

        <div className="text-center">
          <a href="/" className="text-sm text-[var(--brand-text-mid)] underline hover:text-[var(--brand-text)]">Start a new estimate</a>
        </div>
      </div>
    </div>
  )
}

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--brand-bg)] flex items-center justify-center">
        <p className="text-[var(--brand-text-mid)]">Loading your estimate…</p>
      </div>
    }>
      <ResultsContent />
    </Suspense>
  )
}
