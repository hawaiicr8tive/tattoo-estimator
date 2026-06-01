export type TattooStyle = 'fine-line' | 'traditional' | 'geometric' | 'polynesian' | 'realism'

export type TattooSize = 'tiny' | 'small' | 'medium' | 'large' | 'xl'

export type PlacementKey =
  | 'outer-arm' | 'thigh' | 'calf' | 'shoulder' | 'upper-back'
  | 'inner-arm' | 'forearm' | 'chest' | 'stomach' | 'lower-back' | 'shin'
  | 'ribs' | 'spine' | 'neck' | 'hands' | 'feet' | 'ankle'
  | 'fingers' | 'behind-ear' | 'face'

export type ArtistTier = 1 | 2 | 3

export interface StyleOption {
  id: string
  label: string
  description: string
  multiplier: number
}

export interface EstimatorInput {
  style: string
  placement: PlacementKey
  size: TattooSize
  isColor: boolean
  notes?: string
  artistTier?: ArtistTier
}

export interface PriceRange {
  min: number
  max: number
}

export interface TimeRange {
  min: number
  max: number
}

export interface PriceEstimate {
  priceRange: PriceRange
  timeRange: TimeRange
  disclaimer: string
  isConsultationOnly?: boolean
}

export interface XlConfig {
  halfDayRate: { min: number; max: number }
  fullDayRate: { min: number; max: number }
  sessionsRange: { min: number; max: number }
  disclaimer: string
}

export interface Artist {
  id: string
  name: string
  tier: ArtistTier
  bio: string
  styles: TattooStyle[]
  doesColor: boolean
  doesBlackGrey: boolean
  instagramUrl: string
  bookingUrl: string
  photo: string
}

export interface FlashItem {
  id: string
  title: string
  image: string
  style: TattooStyle | string
  artistId?: string
  isColor?: boolean
  price?: number        // flash is often flat-priced; optional
  available?: boolean    // false = already claimed / one-off
}

export interface Lead {
  id?: string
  created_at?: string
  first_name: string
  email: string
  style: TattooStyle
  placement: PlacementKey
  size: TattooSize
  is_color: boolean
  notes?: string
  price_min: number
  price_max: number
  hours_min: number
  hours_max: number
  matched_artists?: string[]
  opted_in: boolean
  source: string
}

export interface EstimatorState extends EstimatorInput {
  firstName: string
  email: string
  optedIn: boolean
  currentStep: number
}
