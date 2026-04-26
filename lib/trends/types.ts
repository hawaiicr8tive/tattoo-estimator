export type IndustryId = 'tattoo' | 'fashion' | 'music' | 'interior'

export interface Industry {
  id: IndustryId
  label: string
  blurb: string
  status: 'active' | 'scaffold'
}

export interface PopularityPoint {
  year: number
  /** 0-100 popularity index in the relevant scene */
  value: number
}

export interface StyleStrand {
  id: string
  label: string
  /** A short tag line a casual reader would recognize. */
  tagline: string
  /** Long description of the visual language and roots. */
  description: string
  /** Earliest credible emergence year. */
  origin: number
  /** Lineage: parent style ids this descends from. */
  ancestors: string[]
  /** Hand-tuned popularity curve over time. Sparse points are fine; the engine interpolates. */
  curve: PopularityPoint[]
  /** Cultural ingredients that historically push this style forward (used for fusion). */
  signals: string[]
  /** Free-form tags for fusion grouping. */
  tags: string[]
  /** Authors / scenes that defined the canonical wave. */
  pioneers?: string[]
}

export interface IndustryDataset {
  industry: Industry
  styles: StyleStrand[]
  /** Notes the engine surfaces about cycle compression for this industry. */
  cycleNotes: string[]
  /** Years used for the chart x-axis. */
  yearRange: { start: number; end: number }
}

export interface DetectedCycle {
  styleId: string
  peaks: number[]
  /** Average gap between detected peaks in years. */
  avgCycleYears: number
  /** Standard deviation of peak gaps. Lower means a more reliable cycle. */
  consistency: number
  /** Years until the next projected peak. */
  yearsToNextPeak: number
  /** Projected next peak year. */
  nextPeakYear: number
  /** 0-100 confidence in the projection. */
  confidence: number
}

export interface TrendForecast {
  styleId: string
  label: string
  /** Right-now momentum score 0-100. */
  momentum: number
  /** Direction of travel for the next 24 months. */
  trajectory: 'rising' | 'cresting' | 'declining' | 'dormant'
  /** Years until projected peak (negative if past peak). */
  yearsToPeak: number
  /** Plain-language headline. */
  headline: string
  /** Short reason this matters now. */
  rationale: string
  cycle: DetectedCycle | null
}

export interface FusionInput {
  baseStyleId: string
  blendStyleId: string
  /** 0-100 weight toward the blend style. */
  blendWeight: number
  /** Cultural acceleration: social media spread, 0-100. */
  socialAccelerant: number
  /** 0-100 chaos / anomaly factor that pushes the result off the canon. */
  anomaly: number
  /** Optional extra signals the user wants to inject. */
  extraSignals?: string[]
}

export interface FusionResult {
  /** Generated working name for the hypothetical emerging style. */
  name: string
  /** 0-100 score for how plausible this fusion is given current strands. */
  plausibility: number
  /** 0-100 estimated time-to-mainstream compression vs canonical 22-year cycle. */
  cycleCompression: number
  /** Years until forecast emergence wave. */
  yearsToEmergence: number
  /** Composite signals that would carry this fusion forward. */
  signals: string[]
  /** Visual ingredients summarized as bullet phrases. */
  ingredients: string[]
  /** A short prediction paragraph. */
  outlook: string
}
