import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { loadFusionHistory, appendFusionHistory, type FusionHistoryEntry } from '@/lib/trends/fusion-history'
import { loadIndustryDataset } from '@/lib/trends/store'
import { fuseStyles } from '@/lib/trends/engine'
import { buildFusionImagePrompt } from '@/lib/trends/fusion-images'
import {
  BATCH_MAX_COUNT,
  BATCH_MIN_COUNT,
  BATCH_DEFAULT_COUNT,
  isValidBatchModel,
  listBatchJobs,
  submitFusionBatch,
  type BatchImageModelId,
} from '@/lib/trends/fusion-batch'

export const maxDuration = 60

function clamp(n: unknown, min: number, max: number, fallback: number): number {
  const v = typeof n === 'number' ? n : Number(n)
  if (!Number.isFinite(v)) return fallback
  return Math.max(min, Math.min(max, Math.round(v)))
}

function readContentFocus(v: unknown): { categoryLabel: string; itemLabel: string } | undefined {
  if (!v || typeof v !== 'object') return undefined
  const o = v as Record<string, unknown>
  if (typeof o.categoryLabel !== 'string' || typeof o.itemLabel !== 'string') return undefined
  if (!o.categoryLabel.trim() || !o.itemLabel.trim()) return undefined
  return { categoryLabel: o.categoryLabel.slice(0, 80), itemLabel: o.itemLabel.slice(0, 80) }
}

function readEntrySnapshot(v: unknown): FusionHistoryEntry | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  if (typeof o.id !== 'string' || !o.id) return null
  if (typeof o.industryId !== 'string') return null
  if (typeof o.baseStyleId !== 'string' || typeof o.blendStyleId !== 'string') return null
  return {
    id: o.id,
    timestamp: typeof o.timestamp === 'string' ? o.timestamp : new Date().toISOString(),
    industryId: o.industryId,
    baseStyleId: o.baseStyleId,
    blendStyleId: o.blendStyleId,
    blendWeight: typeof o.blendWeight === 'number' ? o.blendWeight : 50,
    socialAccelerant: typeof o.socialAccelerant === 'number' ? o.socialAccelerant : 50,
    anomaly: typeof o.anomaly === 'number' ? o.anomaly : 50,
    extraSignals: Array.isArray(o.extraSignals) ? o.extraSignals.filter((s): s is string => typeof s === 'string') : [],
    fusionName: typeof o.fusionName === 'string' ? o.fusionName : 'fusion',
    model: typeof o.model === 'string' ? o.model : 'claude-opus-4-7',
    analysis: typeof o.analysis === 'string' ? o.analysis : '',
    visualDescriptor: typeof o.visualDescriptor === 'string' ? o.visualDescriptor : undefined,
    contentFocus: readContentFocus(o.contentFocus),
    usage: (o.usage && typeof o.usage === 'object' ? o.usage : { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }) as FusionHistoryEntry['usage'],
    images: undefined,
  }
}

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req)
  if (denied) return denied
  const url = new URL(req.url)
  const fusionEntryId = url.searchParams.get('fusionEntryId') ?? undefined
  try {
    const jobs = await listBatchJobs(fusionEntryId)
    return NextResponse.json({ jobs })
  } catch (e) {
    console.error('list batch jobs error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to list batches' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req)
  if (denied) return denied

  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY is not configured on the server.' },
      { status: 500 },
    )
  }

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }
  const x = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>

  const entryId = typeof x.entryId === 'string' ? x.entryId : ''
  const count = clamp(x.count, BATCH_MIN_COUNT, BATCH_MAX_COUNT, BATCH_DEFAULT_COUNT)
  const model: BatchImageModelId = isValidBatchModel(x.model) ? x.model : 'gemini-3-pro-image-preview'
  const chaosDirection = typeof x.chaosDirection === 'string' ? x.chaosDirection.slice(0, 400) : ''
  const visualDescriptorOverride =
    typeof x.visualDescriptor === 'string' && x.visualDescriptor.trim().length > 0
      ? x.visualDescriptor.slice(0, 2000)
      : undefined
  const contentFocusOverride = readContentFocus(x.contentFocus)

  if (!entryId) return NextResponse.json({ error: 'entryId is required' }, { status: 400 })

  // Load (or snapshot-restore) the fusion entry. Same fallback pattern as the
  // real-time image route so a batch can be queued even if the history persist
  // for this entry lagged.
  const history = await loadFusionHistory()
  let entry = history.find(e => e.id === entryId)
  if (!entry) {
    const snap = readEntrySnapshot(x.entrySnapshot)
    if (snap && snap.id === entryId) {
      entry = snap
      try { await appendFusionHistory(snap) } catch (e) {
        console.error('batch submit — snapshot persist failed:', e)
      }
    } else {
      return NextResponse.json({
        error: `Fusion entry ${entryId} not found, and no usable snapshot was provided.`,
      }, { status: 404 })
    }
  }

  // Rebuild the fusion deterministically so the prompts share styling context
  // with the original real-time generations.
  const dataset = await loadIndustryDataset(entry.industryId)
  const baseStrand = dataset.styles.find(s => s.id === entry.baseStyleId)
  const blendStrand = dataset.styles.find(s => s.id === entry.blendStyleId)
  if (!baseStrand || !blendStrand) {
    return NextResponse.json({ error: 'Base or blend strand no longer in dataset' }, { status: 400 })
  }
  const fusion = fuseStyles(baseStrand, blendStrand, {
    baseStyleId: baseStrand.id,
    blendStyleId: blendStrand.id,
    blendWeight: entry.blendWeight,
    socialAccelerant: entry.socialAccelerant,
    anomaly: entry.anomaly,
    extraSignals: entry.extraSignals,
  }, new Date().getFullYear())

  const visualDescriptor = visualDescriptorOverride ?? entry.visualDescriptor
  const contentFocus = contentFocusOverride ?? entry.contentFocus

  // Always ramp chaos 0→100 across the batch — that's the bulk mode's whole
  // point ("dial in the prompt, then sweep across chaos variations overnight").
  const chaosLevels = Array.from({ length: count }, (_, i) =>
    count === 1 ? 0 : Math.round((i / (count - 1)) * 100),
  )
  const prompts = chaosLevels.map(c => buildFusionImagePrompt({
    baseStrand, blendStrand, fusion, visualDescriptor, chaos: c, contentFocus,
    chaosDirection: chaosDirection || undefined,
  }))

  try {
    const job = await submitFusionBatch({
      apiKey,
      fusionEntryId: entryId,
      industryId: entry.industryId,
      model,
      prompts,
      chaosDirection: chaosDirection || undefined,
    })
    return NextResponse.json({ job })
  } catch (e) {
    console.error('fusion batch submit error:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to submit batch' },
      { status: 500 },
    )
  }
}
