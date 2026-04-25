import type { EstimatorInput, PriceEstimate, TattooStyle, TattooSize, PlacementKey, ArtistTier } from './types'
import pricingConfig from '../data/pricing-config.json'

// ─── Single source of truth for all pricing ───────────────────────────────
// To update any rate or multiplier, change pricing-config.json only.

const SHOP_MINIMUM: number = pricingConfig.shopMinimum

const TIER_RATES: Record<string, { min: number; max: number }> = pricingConfig.tierRates

const SIZE_HOURS: Record<TattooSize, [number, number]> = pricingConfig.sizeHours as Record<TattooSize, [number, number]>

const STYLE_MULTIPLIERS: Record<TattooStyle, number> = pricingConfig.styleMultipliers as Record<TattooStyle, number>

const PLACEMENT_MULTIPLIERS: Record<PlacementKey, number> = pricingConfig.placementMultipliers as Record<PlacementKey, number>

const COLOR_MULTIPLIER: number = pricingConfig.colorMultiplier

export function calculateEstimate(
  input: EstimatorInput,
  extraStyleMultipliers?: Record<string, number>
): PriceEstimate {
  const { style, placement, size, isColor, artistTier = 1 } = input

  // XL is consultation-only — render side fetches the full xlConfig (day rates,
  // session range, disclaimer) at runtime; these legacy fields remain for the
  // leads-table snapshot and for fallback rendering.
  if (size === 'xl') {
    const xl = pricingConfig.xlConfig
    const dayMin = xl?.halfDayRate?.min ?? 800
    const dayMax = xl?.fullDayRate?.max ?? 3000
    const sMin   = xl?.sessionsRange?.min ?? 1
    const sMax   = xl?.sessionsRange?.max ?? 10
    return {
      priceRange: { min: dayMin * sMin, max: dayMax * sMax },
      timeRange: { min: 8, max: 16 },
      disclaimer: xl?.disclaimer ?? 'Final pricing confirmed at consultation. This is a guide, not a quote.',
      isConsultationOnly: true,
    }
  }

  const baseHours = SIZE_HOURS[size as TattooSize]
  const styleMultiplier = extraStyleMultipliers?.[style] ?? STYLE_MULTIPLIERS[style as TattooStyle] ?? 1.0
  const placementMultiplier = PLACEMENT_MULTIPLIERS[placement]
  const colorMultiplier = isColor ? COLOR_MULTIPLIER : 1.0
  const tierRates = TIER_RATES[String(artistTier)]

  const adjustedHoursMin = baseHours[0] * styleMultiplier * placementMultiplier * colorMultiplier
  const adjustedHoursMax = baseHours[1] * styleMultiplier * placementMultiplier * colorMultiplier

  const priceMin = Math.max(SHOP_MINIMUM, Math.round((adjustedHoursMin * tierRates.min) / 50) * 50)
  const priceMax = Math.round((adjustedHoursMax * tierRates.max) / 50) * 50

  return {
    priceRange: { min: priceMin, max: priceMax },
    timeRange: {
      min: Math.round(adjustedHoursMin * 10) / 10,
      max: Math.round(adjustedHoursMax * 10) / 10,
    },
    disclaimer: 'Final pricing confirmed at consultation. This is a guide, not a quote.',
    isConsultationOnly: false,
  }
}

// Calculate estimates across all tiers and return the full range
export function calculateEstimateAllTiers(
  input: EstimatorInput,
  extraStyleMultipliers?: Record<string, number>
): PriceEstimate {
  const tier1 = calculateEstimate({ ...input, artistTier: 1 }, extraStyleMultipliers)
  const tier3 = calculateEstimate({ ...input, artistTier: 3 }, extraStyleMultipliers)
  return {
    priceRange: { min: tier1.priceRange.min, max: tier3.priceRange.max },
    timeRange: { min: tier1.timeRange.min, max: tier3.timeRange.max },
    disclaimer: tier1.disclaimer,
    isConsultationOnly: tier1.isConsultationOnly,
  }
}
