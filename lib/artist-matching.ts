import type { EstimatorInput, Artist, ArtistTier, TattooSize, PlacementKey } from './types'

const PLACEMENT_DIFFICULTY: Record<PlacementKey, 'easy' | 'moderate' | 'difficult' | 'premium'> = {
  'outer-arm': 'easy',    'thigh': 'easy',       'calf': 'easy',      'shoulder': 'easy', 'upper-back': 'easy',
  'inner-arm': 'moderate','forearm': 'moderate', 'chest': 'moderate', 'stomach': 'moderate',
  'lower-back': 'moderate', 'shin': 'moderate',
  'ribs': 'difficult',   'spine': 'difficult',  'neck': 'difficult', 'hands': 'difficult',
  'feet': 'difficult',   'ankle': 'difficult',
  'fingers': 'premium',  'behind-ear': 'premium','face': 'premium',
}

const SIZE_MIN_TIER: Record<TattooSize, ArtistTier> = {
  tiny: 1, small: 1, medium: 1, large: 2, xl: 2,
}

function minTierFor(size: TattooSize, placement: PlacementKey): ArtistTier {
  const diff = PLACEMENT_DIFFICULTY[placement] ?? 'easy'
  const placementMin: ArtistTier = diff === 'easy' || diff === 'moderate' ? 1 : 2
  return Math.max(SIZE_MIN_TIER[size] ?? 1, placementMin) as ArtistTier
}

function scoreArtist(artist: Artist, style: string, isColor: boolean, minTier: ArtistTier): number {
  // Hard filter: must have the style
  if (!artist.styles.includes(style as never)) return 0

  // Hard filter: color/B&G capability
  if (isColor && !artist.doesColor) return 0
  if (!isColor && !artist.doesBlackGrey) return 0

  // Hard filter: tier meets complexity minimum
  if (artist.tier < minTier) return 0

  // Score: tier (higher = more relevant for complex work) + style position bonus
  const tierScore = artist.tier * 10
  const specialtyBonus = artist.styles[0] === style ? 3 : 0
  return tierScore + specialtyBonus
}

export function matchArtists(input: EstimatorInput, artists: Artist[]): Artist[] {
  const { style, isColor, size, placement } = input
  const minTier = minTierFor(size, placement)

  // Score and filter
  const scored = artists
    .map(a => ({ artist: a, score: scoreArtist(a, style, isColor, minTier) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)

  let results = scored.map(x => x.artist).slice(0, 3)

  // Fallback 1: relax tier requirement if nothing qualifies
  if (results.length === 0) {
    const relaxed = artists
      .filter(a => a.styles.includes(style as never) && (isColor ? a.doesColor : a.doesBlackGrey))
      .sort((a, b) => b.tier - a.tier || a.name.localeCompare(b.name))
    results = relaxed.slice(0, 3)
  }

  // Fallback 2: relax color requirement too
  if (results.length === 0) {
    results = artists
      .filter(a => a.styles.includes(style as never))
      .sort((a, b) => b.tier - a.tier || a.name.localeCompare(b.name))
      .slice(0, 3)
  }

  return results
}
