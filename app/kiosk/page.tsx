'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useBranding } from '@/components/BrandingProvider'
import SwipeDeck from '@/components/kiosk/SwipeDeck'
import BrandFrame from '@/components/kiosk/BrandFrame'
import AttractScreen from '@/components/kiosk/AttractScreen'
import KioskImage from '@/components/kiosk/KioskImage'
import type { Artist, FlashItem } from '@/lib/types'
import flashSeed from '@/data/flash.json'
import artistsSeed from '@/data/artists.json'

const SHOP_NAME = 'Tattoolicious'
const IDLE_MS = 60_000 // return to the attract loop after 1 min untouched

type Tab = 'flash' | 'artists'

export default function KioskPage() {
  const { bookingUrl } = useBranding()

  // Seed with bundled data so the kiosk renders instantly (and offline /
  // with no backend configured); the API refresh below overrides it if it
  // returns admin-managed data.
  const [flash, setFlash] = useState<FlashItem[]>(flashSeed as FlashItem[])
  const [artists, setArtists] = useState<Artist[]>(artistsSeed as Artist[])
  const [tab, setTab] = useState<Tab>('flash')
  const [flashIndex, setFlashIndex] = useState(0)
  const [artistIndex, setArtistIndex] = useState(0)
  const [attract, setAttract] = useState(true)

  // Only read while the attract screen is dismissed, which always sets it first.
  const lastActive = useRef(0)

  // Load data from the same APIs the estimator uses.
  useEffect(() => {
    fetch('/api/flash').then(r => r.json())
      .then((d: FlashItem[]) => { if (Array.isArray(d) && d.length) setFlash(d) }).catch(() => {})
    fetch('/api/artists').then(r => r.json())
      .then((d: Artist[]) => { if (Array.isArray(d) && d.length) setArtists(d) }).catch(() => {})
  }, [])

  const artistById = useMemo(
    () => Object.fromEntries(artists.map(a => [a.id, a])),
    [artists],
  )

  const resetIdle = useCallback(() => { lastActive.current = Date.now() }, [])

  // Idle watcher → drop back to the attract loop and reset to a fresh start.
  useEffect(() => {
    const t = setInterval(() => {
      if (!attract && Date.now() - lastActive.current > IDLE_MS) {
        setAttract(true)
        setFlashIndex(0)
        setArtistIndex(0)
        setTab('flash')
      }
    }, 1000)
    return () => clearInterval(t)
  }, [attract])

  function switchTab(next: Tab) {
    setTab(next)
    resetIdle()
  }

  const attractImages = useMemo(() => {
    const imgs = flash.map(f => f.image)
    return imgs.length ? imgs : artists.map(a => a.photo)
  }, [flash, artists])

  function renderFlash(item: FlashItem, _i: number, active: boolean) {
    const artist = item.artistId ? artistById[item.artistId] : undefined
    return (
      <div className="relative h-full w-full bg-black">
        <KioskImage
          src={item.image}
          alt={item.title}
          eager={active}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-7 pb-24 pt-28 text-white">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide backdrop-blur-sm">
              {String(item.style).replace('-', ' ')}
            </span>
            {item.isColor !== undefined && (
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
                {item.isColor ? 'Color' : 'Black & Grey'}
              </span>
            )}
            {item.available === false && (
              <span className="rounded-full bg-red-500/80 px-3 py-1 text-xs font-bold">Claimed</span>
            )}
          </div>
          <h2 className="text-4xl font-black leading-tight">{item.title}</h2>
          {artist && <p className="mt-1 text-lg text-white/80">by {artist.name}</p>}
          <div className="mt-4 flex items-center gap-3">
            {typeof item.price === 'number' && (
              <span className="text-2xl font-bold">${item.price}</span>
            )}
            {/* AI concierge hook — phase 2 swaps this for the guided chat. */}
            <a
              href={artist?.bookingUrl ?? bookingUrl}
              className="rounded-full px-6 py-3 text-base font-bold text-white"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              Ask about this design
            </a>
          </div>
        </div>
      </div>
    )
  }

  function renderArtist(item: Artist, _i: number, active: boolean) {
    return (
      <div className="relative h-full w-full bg-black">
        <KioskImage
          src={item.photo}
          alt={item.name}
          eager={active}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-7 pb-24 pt-28 text-white">
          <h2 className="text-4xl font-black leading-tight">{item.name}</h2>
          <p className="mt-2 text-lg text-white/85">{item.bio}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {item.styles.map(s => (
              <span key={s} className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide backdrop-blur-sm">
                {s.replace('-', ' ')}
              </span>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <a href={item.bookingUrl} className="rounded-full px-6 py-3 text-base font-bold text-white" style={{ backgroundColor: 'var(--brand-primary)' }}>
              Book with {item.name.split(' ')[0]}
            </a>
            <a href={item.instagramUrl} className="rounded-full border border-white/40 px-5 py-3 text-base font-semibold text-white">
              Instagram
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="kiosk fixed inset-0 z-50 overflow-hidden bg-black text-white"
      onPointerDownCapture={resetIdle}
    >
      {tab === 'flash' ? (
        <SwipeDeck
          items={flash}
          index={flashIndex}
          onIndexChange={setFlashIndex}
          onInteract={resetIdle}
          renderItem={renderFlash}
          keyFor={f => f.id}
        />
      ) : (
        <SwipeDeck
          items={artists}
          index={artistIndex}
          onIndexChange={setArtistIndex}
          onInteract={resetIdle}
          renderItem={renderArtist}
          keyFor={a => a.id}
        />
      )}

      <BrandFrame shopName={SHOP_NAME} />

      {/* Flash / Artists switch — large targets, above the brand overlay */}
      <div className="absolute inset-x-0 bottom-9 z-30 flex justify-center">
        <div className="flex gap-1 rounded-full bg-black/50 p-1 backdrop-blur-md">
          {(['flash', 'artists'] as Tab[]).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => switchTab(t)}
              className={`rounded-full px-7 py-3 text-base font-bold capitalize transition-colors ${
                tab === t ? 'text-white' : 'text-white/60'
              }`}
              style={tab === t ? { backgroundColor: 'var(--brand-primary)' } : undefined}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {attract && (
        <AttractScreen
          images={attractImages}
          shopName={SHOP_NAME}
          onDismiss={() => { setAttract(false); resetIdle() }}
        />
      )}
    </div>
  )
}
