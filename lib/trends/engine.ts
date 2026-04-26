import type {
  DetectedCycle,
  FusionInput,
  FusionResult,
  IndustryDataset,
  PopularityPoint,
  StyleStrand,
  TrendForecast,
} from './types'

/**
 * Canonical generational cycle in years before social media compression
 * (bell-bottoms 70s -> late 90s, fine line 80s -> 2005, etc.)
 */
const CANONICAL_CYCLE_YEARS = 22

/** Fraction of canonical cycle that internet-native styles tend to take. */
const COMPRESSED_CYCLE_RATIO = 0.45

/**
 * Linearly interpolate a sparse popularity curve so the engine can read any year.
 */
export function interpolate(curve: PopularityPoint[], year: number): number {
  if (curve.length === 0) return 0
  const sorted = [...curve].sort((a, b) => a.year - b.year)
  if (year <= sorted[0].year) return sorted[0].value
  if (year >= sorted[sorted.length - 1].year) return sorted[sorted.length - 1].value
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i]
    const b = sorted[i + 1]
    if (year >= a.year && year <= b.year) {
      const t = (year - a.year) / (b.year - a.year)
      return a.value + (b.value - a.value) * t
    }
  }
  return sorted[sorted.length - 1].value
}

/**
 * Resample a sparse curve to a yearly array for chart rendering.
 */
export function densifyCurve(curve: PopularityPoint[], start: number, end: number): PopularityPoint[] {
  const out: PopularityPoint[] = []
  for (let y = start; y <= end; y++) out.push({ year: y, value: Math.round(interpolate(curve, y)) })
  return out
}

/**
 * Detect peaks in a curve. A peak is a local maximum above a relative threshold,
 * separated by at least minSpacing years from another peak.
 */
export function detectPeaks(curve: PopularityPoint[], opts?: { minSpacing?: number; minHeight?: number }): number[] {
  const minSpacing = opts?.minSpacing ?? 6
  const minHeight = opts?.minHeight ?? 50
  if (curve.length < 3) return []
  const start = curve[0].year
  const end = curve[curve.length - 1].year
  const dense = densifyCurve(curve, start, end)
  const peaks: { year: number; value: number }[] = []
  for (let i = 1; i < dense.length - 1; i++) {
    const prev = dense[i - 1].value
    const cur = dense[i].value
    const next = dense[i + 1].value
    if (cur >= minHeight && cur >= prev && cur >= next) {
      peaks.push({ year: dense[i].year, value: cur })
    }
  }
  // Collapse plateau peaks: keep the highest within minSpacing window.
  const collapsed: { year: number; value: number }[] = []
  for (const p of peaks) {
    const last = collapsed[collapsed.length - 1]
    if (last && p.year - last.year < minSpacing) {
      if (p.value > last.value) collapsed[collapsed.length - 1] = p
    } else {
      collapsed.push(p)
    }
  }
  return collapsed.map(p => p.year)
}

function stddev(values: number[]): number {
  if (values.length === 0) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

/**
 * Decide whether a style is internet-accelerated based on its first peak year and tags.
 */
function compressionFactor(style: StyleStrand): number {
  const tagBoost = style.tags.includes('fusion') || style.signals.some(s => /tiktok|instagram-native|fast cycle/i.test(s))
  const youngOrigin = style.origin >= 2010
  if (tagBoost || youngOrigin) return COMPRESSED_CYCLE_RATIO
  return 1
}

export function detectCycle(style: StyleStrand, currentYear: number): DetectedCycle | null {
  const peaks = detectPeaks(style.curve)
  if (peaks.length < 2) {
    // Not enough peaks for a real cycle; use canonical assumption from origin.
    if (peaks.length === 1) {
      const compress = compressionFactor(style)
      const cycle = CANONICAL_CYCLE_YEARS * compress
      const next = peaks[0] + cycle
      return {
        styleId: style.id,
        peaks,
        avgCycleYears: cycle,
        consistency: 0,
        yearsToNextPeak: Math.round(next - currentYear),
        nextPeakYear: Math.round(next),
        confidence: 25,
      }
    }
    return null
  }
  const gaps: number[] = []
  for (let i = 1; i < peaks.length; i++) gaps.push(peaks[i] - peaks[i - 1])
  const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length
  const sd = stddev(gaps)
  const compress = compressionFactor(style)
  const projectedCycle = avg * compress
  const lastPeak = peaks[peaks.length - 1]
  const nextPeak = lastPeak + projectedCycle
  // Consistency confidence: tight gaps -> high confidence; lots of peaks -> high confidence.
  const tightness = sd === 0 ? 1 : Math.max(0, 1 - sd / Math.max(1, avg))
  const sampleConfidence = Math.min(1, peaks.length / 4)
  const confidence = Math.round(tightness * 60 + sampleConfidence * 40)
  return {
    styleId: style.id,
    peaks,
    avgCycleYears: avg,
    consistency: Math.round((1 - tightness) * 100),
    yearsToNextPeak: Math.round(nextPeak - currentYear),
    nextPeakYear: Math.round(nextPeak),
    confidence,
  }
}

/**
 * Compute a 0-100 momentum score for the current year using the slope and absolute level.
 */
export function momentumScore(style: StyleStrand, currentYear: number): number {
  const today = interpolate(style.curve, currentYear)
  const recent = interpolate(style.curve, currentYear - 3)
  const slope = today - recent
  // Normalize: today contributes 60%, slope (scaled) 40%.
  const slopeScore = Math.max(-30, Math.min(30, slope))
  const score = today * 0.6 + (slopeScore + 30) * (40 / 60)
  return Math.max(0, Math.min(100, Math.round(score)))
}

function trajectoryFor(style: StyleStrand, currentYear: number, cycle: DetectedCycle | null): TrendForecast['trajectory'] {
  const today = interpolate(style.curve, currentYear)
  const recent = interpolate(style.curve, currentYear - 3)
  const slope = today - recent
  if (today < 25) return 'dormant'
  if (cycle && cycle.yearsToNextPeak <= 2 && cycle.yearsToNextPeak >= -1 && today >= 60) return 'cresting'
  if (slope > 6) return 'rising'
  if (slope < -6) return 'declining'
  return today >= 70 ? 'cresting' : 'rising'
}

function headlineFor(style: StyleStrand, momentum: number, traj: TrendForecast['trajectory'], cycle: DetectedCycle | null): string {
  if (traj === 'rising' && cycle && cycle.yearsToNextPeak <= 5 && cycle.yearsToNextPeak > 0) {
    return `${style.label} on track for a peak around ${cycle.nextPeakYear}.`
  }
  if (traj === 'cresting') return `${style.label} is at the leading edge — saturation watch.`
  if (traj === 'declining') return `${style.label} is fading from the foreground.`
  if (traj === 'dormant') {
    if (cycle && cycle.yearsToNextPeak > 0 && cycle.yearsToNextPeak <= 12) {
      return `${style.label} dormant; cycle math points to a return by ${cycle.nextPeakYear}.`
    }
    return `${style.label} dormant; no resurgence signal yet.`
  }
  return `${style.label} climbing; momentum ${momentum}.`
}

function rationaleFor(style: StyleStrand, cycle: DetectedCycle | null, currentYear: number): string {
  const parts: string[] = []
  if (cycle && cycle.peaks.length >= 2) {
    parts.push(`Past peaks: ${cycle.peaks.join(', ')}.`)
    parts.push(`Avg cycle ${cycle.avgCycleYears.toFixed(1)}y, projected next ${cycle.nextPeakYear}.`)
  }
  const compressed = compressionFactor(style) < 1
  if (compressed) parts.push('Marked as social-media accelerated — cycle compressed ~55%.')
  const today = interpolate(style.curve, currentYear)
  parts.push(`Current popularity index ${today.toFixed(0)}/100.`)
  return parts.join(' ')
}

export function forecastStyle(style: StyleStrand, currentYear: number): TrendForecast {
  const cycle = detectCycle(style, currentYear)
  const momentum = momentumScore(style, currentYear)
  const trajectory = trajectoryFor(style, currentYear, cycle)
  const yearsToPeak = cycle ? cycle.yearsToNextPeak : 0
  return {
    styleId: style.id,
    label: style.label,
    momentum,
    trajectory,
    yearsToPeak,
    headline: headlineFor(style, momentum, trajectory, cycle),
    rationale: rationaleFor(style, cycle, currentYear),
    cycle,
  }
}

export function forecastDataset(dataset: IndustryDataset, currentYear: number): TrendForecast[] {
  return dataset.styles
    .map(s => forecastStyle(s, currentYear))
    .sort((a, b) => {
      // Surface rising / cresting first, then by momentum.
      const traj = (t: TrendForecast['trajectory']) =>
        t === 'rising' ? 0 : t === 'cresting' ? 1 : t === 'declining' ? 2 : 3
      const tDelta = traj(a.trajectory) - traj(b.trajectory)
      if (tDelta !== 0) return tDelta
      return b.momentum - a.momentum
    })
}

/* ------------------------------------------------------------------ */
/* Fusion synthesis                                                    */
/* ------------------------------------------------------------------ */

const FUSION_PREFIXES = [
  'neo',
  'cyber',
  'post',
  'micro',
  'hyper',
  'soft',
  'wet',
  'shadow',
  'glass',
  'noise',
  'velvet',
  'spectral',
]

const FUSION_SUFFIXES = ['core', 'wave', 'flash', 'sigil', 'opera', 'mode', 'gothic', 'bloom']

/**
 * Deterministic small hash so the same fusion inputs name the same style.
 */
function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function nameFusion(base: StyleStrand, blend: StyleStrand, anomaly: number): string {
  const seed = hashStr(`${base.id}|${blend.id}|${anomaly}`)
  const prefix = FUSION_PREFIXES[seed % FUSION_PREFIXES.length]
  const suffix = FUSION_SUFFIXES[(seed >> 3) % FUSION_SUFFIXES.length]
  // Pull the more distinctive single word from each label.
  const baseWord = base.label.split(/[\s/]+/)[0]
  const blendWord = blend.label.split(/[\s/]+/)[0]
  return `${prefix}-${baseWord.toLowerCase()} ${blendWord.toLowerCase()} ${suffix}`
}

function uniq<T>(xs: T[]): T[] {
  return Array.from(new Set(xs))
}

/**
 * Plausibility rises with shared signals/tags, falls with extreme anomaly.
 * The point of anomaly is novelty, not absurdity, so the curve is non-monotonic.
 */
function plausibility(base: StyleStrand, blend: StyleStrand, fusion: FusionInput): number {
  const tagOverlap = base.tags.filter(t => blend.tags.includes(t)).length
  const signalOverlap = base.signals.filter(s => blend.signals.includes(s)).length
  const overlap = tagOverlap * 8 + signalOverlap * 6
  const ancestorBridge = base.ancestors.includes(blend.id) || blend.ancestors.includes(base.id) ? 12 : 0
  const sharedAncestor = base.ancestors.some(a => blend.ancestors.includes(a)) ? 8 : 0
  // Anomaly sweet spot at ~35-55, drop after 70.
  const a = fusion.anomaly
  const anomalyCurve = a <= 50 ? a * 0.4 : Math.max(0, 50 * 0.4 - (a - 50) * 0.6)
  const social = fusion.socialAccelerant * 0.15
  const score = 38 + overlap + ancestorBridge + sharedAncestor + anomalyCurve + social
  return Math.max(0, Math.min(100, Math.round(score)))
}

export function fuseStyles(
  base: StyleStrand,
  blend: StyleStrand,
  input: FusionInput,
  currentYear: number,
): FusionResult {
  const name = nameFusion(base, blend, input.anomaly)
  const compressionFromSocial = 1 - (input.socialAccelerant / 100) * 0.7
  // Anomaly speeds emergence (chaos shortens lead time) but lowers plausibility past 60.
  const compressionFromAnomaly = 1 - (input.anomaly / 100) * 0.3
  const cycleCompression = Math.round((1 - compressionFromSocial * compressionFromAnomaly) * 100)
  const yearsToEmergence = Math.max(
    0,
    Math.round(CANONICAL_CYCLE_YEARS * compressionFromSocial * compressionFromAnomaly * 0.35),
  )
  const plaus = plausibility(base, blend, input)
  const baseSignals = base.signals.slice(0, 3)
  const blendSignals = blend.signals.slice(0, 3)
  const signals = uniq([...baseSignals, ...blendSignals, ...(input.extraSignals ?? [])])
  if (input.socialAccelerant > 60) signals.push('platform-native virality')
  if (input.anomaly > 60) signals.push('anti-canon mutation')

  const blendShare = Math.round(input.blendWeight)
  const baseShare = 100 - blendShare
  const ingredients = [
    `${baseShare}% ${base.label.toLowerCase()} — ${base.tagline.toLowerCase()}`,
    `${blendShare}% ${blend.label.toLowerCase()} — ${blend.tagline.toLowerCase()}`,
    input.anomaly > 50 ? 'Deliberate rule-breaking on line weight, palette or composition' : 'Conservative deviation from canon',
    input.socialAccelerant > 50 ? 'Designed to read at thumbnail scale on vertical video' : 'Built for in-person and print',
  ]

  const outlook = [
    `Working name: "${name}".`,
    `Plausibility ${plaus}/100, cycle compression ~${cycleCompression}%.`,
    yearsToEmergence === 0
      ? 'Already actionable — early adopters are the differentiator window.'
      : `Forecast emergence wave in ~${yearsToEmergence} year(s) (peak ~${currentYear + yearsToEmergence + 2}).`,
    plaus >= 70
      ? 'Strong overlap in signals and lineage — this can carry a portfolio.'
      : plaus >= 45
        ? 'Coherent enough to test as a flash sheet; refine the ingredients before a full sleeve.'
        : 'Speculative; treat as a one-off experiment, not a portfolio direction.',
  ].join(' ')

  return {
    name,
    plausibility: plaus,
    cycleCompression,
    yearsToEmergence,
    signals,
    ingredients,
    outlook,
  }
}
