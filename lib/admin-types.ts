import type { Artist } from './types'
import type { BrandingConfig } from './branding'
export type { BrandingConfig }

export interface AdminPricing {
  shopMinimum: number
  tierRates: Record<string, { min: number; max: number }>
  colorMultiplier: number
}

export interface AdminStyle {
  id: string
  label: string
  description: string
  multiplier: number
}

export interface AdminSize {
  id: string
  label: string
  dims: string
  analog: string
  hoursMin: number
  hoursMax: number
  note: string
}

export interface AdminPlacement {
  id: string
  label: string
  group: string
  multiplier: number
}

export interface AdminConfig {
  pricing: AdminPricing
  styles: AdminStyle[]
  sizes: AdminSize[]
  placements: AdminPlacement[]
  artists: Artist[]
  branding: Partial<BrandingConfig>
}
