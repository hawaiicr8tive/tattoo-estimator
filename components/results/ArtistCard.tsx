'use client'
import type { Artist } from '@/lib/types'

interface Props {
  artist: Artist
  rank: number
}

const TIER_LABELS: Record<number, string> = {
  3: 'Featured Artist',
  2: 'Senior Artist',
  1: 'Artist',
}

export default function ArtistCard({ artist, rank }: Props) {
  return (
    <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-4 flex items-start gap-4">
      <div className="w-14 h-14 rounded-full bg-[var(--brand-bg)] border border-gray-200 shrink-0 overflow-hidden flex items-center justify-center text-2xl">
        {artist.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={artist.photo} alt={artist.name} className="w-full h-full object-cover" />
        ) : (
          <span>🎨</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-bold text-[var(--brand-text)]">{artist.name}</h3>
          {rank === 0 && (
            <span className="rounded-full bg-[var(--brand-primary)] px-2 py-0.5 text-xs font-bold text-[var(--brand-primary-text)]">Best Match</span>
          )}
        </div>
        <p className="text-xs text-[var(--brand-primary)] font-medium mb-1">{TIER_LABELS[artist.tier]}</p>
        <p className="text-xs text-[var(--brand-text-mid)] line-clamp-2 mb-3">{artist.bio}</p>
        <a
          href={artist.bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded-lg bg-[var(--brand-primary)] px-4 py-1.5 text-xs font-bold text-[var(--brand-primary-text)] hover:opacity-90 transition-opacity"
        >
          Book with {artist.name.split(' ')[0]}
        </a>
      </div>
    </div>
  )
}
