'use client'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import PriceCard from '@/components/results/PriceCard'
import ArtistCard from '@/components/results/ArtistCard'
import BookingCTA from '@/components/results/BookingCTA'
import type { Lead, Artist, PriceEstimate } from '@/lib/types'
import artistsData from '@/data/artists.json'

const allArtists = artistsData as Artist[]

function ResultsContent() {
  const params = useSearchParams()
  const id = params.get('id')
  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      setError('No estimate ID provided.')
      setLoading(false)
      return
    }
    fetch(`/api/submit-lead?id=${encodeURIComponent(id)}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setLead(data)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center">
        <p className="text-[#555555]">Loading your estimate…</p>
      </div>
    )
  }

  if (error || !lead) {
    return (
      <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-[#7B0000] font-bold mb-2">Estimate not found</p>
          <p className="text-sm text-[#555555]">{error}</p>
          <a href="/" className="mt-4 inline-block text-sm text-[#7B0000] underline">Start over</a>
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
    <div className="min-h-screen bg-[#F5F5F0] px-4 py-10">
      <div className="mx-auto w-full max-w-md space-y-5">
        <div className="text-center">
          <h1 className="text-2xl font-black tracking-tight text-[#0A0A0A]">Tattoolicious</h1>
          <p className="text-sm text-[#555555] mt-1">Your Estimate</p>
        </div>

        <PriceCard estimate={estimate} firstName={lead.first_name} />

        {matchedArtists.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-[#0A0A0A] uppercase tracking-wide mb-3">Artists for Your Style</h2>
            <div className="space-y-3">
              {matchedArtists.map((artist, i) => (
                <ArtistCard key={artist.id} artist={artist} rank={i} />
              ))}
            </div>
          </div>
        )}

        <BookingCTA />

        <p className="text-center text-xs text-[#555555]">
          We've sent a copy to {lead.email}
        </p>

        <div className="text-center">
          <a href="/" className="text-sm text-[#555555] underline hover:text-[#0A0A0A]">Start a new estimate</a>
        </div>
      </div>
    </div>
  )
}

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center">
        <p className="text-[#555555]">Loading your estimate…</p>
      </div>
    }>
      <ResultsContent />
    </Suspense>
  )
}
