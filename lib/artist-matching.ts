import type { EstimatorInput, Artist, TattooStyle } from './types'
import artistsData from '../data/artists.json'

const artists = artistsData as Artist[]

export function matchArtists(input: EstimatorInput): Artist[] {
  const { style, isColor } = input

  // Step 1: Filter artists who specialize in the selected style
  let matches = artists.filter(a => a.styles.includes(style as TattooStyle))

  // Step 2: Prefer artists who work in the selected color mode
  const preferred = matches.filter(a =>
    isColor ? a.doesColor : a.doesBlackGrey
  )

  // Step 3: Use preferred list if it has results, otherwise fall back to style match
  const pool = preferred.length > 0 ? preferred : matches

  // Step 4: Sort by tier (featured first = higher tier number) then alphabetically
  pool.sort((a, b) => b.tier - a.tier || a.name.localeCompare(b.name))

  // Step 5: Return top 3
  const results = pool.slice(0, 3)

  // Fallback: if no style match found, return all Tier 1 artists
  if (results.length === 0) {
    return artists
      .filter(a => a.tier === 1)
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 3)
  }

  return results
}
