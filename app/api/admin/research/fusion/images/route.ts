import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getServiceClient } from '@/lib/supabase'
import { appendFusionHistory, appendFusionImages, loadFusionHistory, type FusionHistoryEntry } from '@/lib/trends/fusion-history'
import { loadIndustryDataset } from '@/lib/trends/store'

// Vercel Pro caps function execution at 300s; the previous default could clip
// long sweeps. Explicit is better. (Hobby caps at 60s; this flag is a no-op
// there and the function still gets cut at the plan limit.)
export const maxDuration = 300
import {
  buildFusionImagePrompt,
  DEFAULT_IMAGE_MODEL,
  generateBatchWithConcurrency,
  isOpenRouterImageModel,
  isReplicateImageModel,
  isValidImageModel,
  type FusionImageRecord,
  type ImageModelId,
} from '@/lib/trends/fusion-images'
import { fuseStyles } from '@/lib/trends/engine'

const STORAGE_BUCKET = 'fusion-images'
const MAX_PER_REQUEST = 20
/** Soft per-day cap to keep accidental loops cheap. Override via env var. */
const MAX_PER_DAY = Number(process.env.FUSION_IMAGE_DAILY_CAP ?? '200')

function clamp(n: unknown, min: number, max: number, fallback: number): number {
  const v = typeof n === 'number' ? n : Number(n)
  if (!Number.isFinite(v)) return fallback
  return Math.max(min, Math.min(max, v))
}

/**
 * Validate a client-provided fusion entry snapshot, used as a fallback when
 * the DB lookup for `entryId` misses (e.g. the original persist failed
 * silently or hasn't propagated yet). Mirrors the FusionHistoryEntry shape
 * but is intentionally tolerant — we accept anything we can use and reject
 * the rest.
 */
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

async function appendFusionHistoryFromSnapshot(snap: FusionHistoryEntry): Promise<void> {
  await appendFusionHistory(snap)
}

function readContentFocus(v: unknown): { categoryLabel: string; itemLabel: string } | undefined {
  if (!v || typeof v !== 'object') return undefined
  const o = v as Record<string, unknown>
  if (typeof o.categoryLabel !== 'string' || typeof o.itemLabel !== 'string') return undefined
  if (!o.categoryLabel.trim() || !o.itemLabel.trim()) return undefined
  return { categoryLabel: o.categoryLabel.slice(0, 80), itemLabel: o.itemLabel.slice(0, 80) }
}

async function imagesGeneratedToday(): Promise<number> {
  const all = await loadFusionHistory()
  const todayUtc = new Date().toISOString().slice(0, 10)
  return all.reduce((acc, entry) => {
    const count = (entry.images ?? []).filter(img => img.createdAt.slice(0, 10) === todayUtc).length
    return acc + count
  }, 0)
}

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req)
  if (denied) return denied

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const x = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>

  const entryId = typeof x.entryId === 'string' ? x.entryId : ''
  const count = clamp(x.count, 1, MAX_PER_REQUEST, 4)
  const chaos = clamp(x.chaos, 0, 100, 0)
  const chaosSweep = x.chaosSweep === true
  const imageModel: ImageModelId = isValidImageModel(x.imageModel) ? (x.imageModel as ImageModelId) : DEFAULT_IMAGE_MODEL

  // Pick the right provider key based on the model id prefix.
  let apiKey: string | undefined
  let requiredVar: string
  if (isReplicateImageModel(imageModel)) {
    apiKey = process.env.REPLICATE_API_TOKEN
    requiredVar = 'REPLICATE_API_TOKEN'
  } else if (isOpenRouterImageModel(imageModel)) {
    apiKey = process.env.OPENROUTER_API_KEY
    requiredVar = 'OPENROUTER_API_KEY'
  } else {
    apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY
    requiredVar = 'GEMINI_API_KEY'
  }
  if (!apiKey) {
    return NextResponse.json(
      { error: `${requiredVar} is not configured on the server.` },
      { status: 500 },
    )
  }
  const visualDescriptorOverride =
    typeof x.visualDescriptor === 'string' && x.visualDescriptor.trim().length > 0
      ? x.visualDescriptor.slice(0, 2000)
      : undefined
  const contentFocusOverride = readContentFocus(x.contentFocus)
  // Optional creative direction text — same field used by bulk batch. Layered
  // into every prompt in the batch as additional inspiration alongside the
  // ramped chaos value.
  const chaosDirection = typeof x.chaosDirection === 'string'
    ? x.chaosDirection.slice(0, 400).trim() || undefined
    : undefined
  if (!entryId) {
    return NextResponse.json({ error: 'entryId is required' }, { status: 400 })
  }

  // Daily soft cap.
  const generatedToday = await imagesGeneratedToday()
  if (generatedToday + count > MAX_PER_DAY) {
    return NextResponse.json(
      {
        error: `Daily image-gen cap reached (${MAX_PER_DAY}/day). Already generated ${generatedToday} today.`,
      },
      { status: 429 },
    )
  }

  // Load the fusion entry. Falls back to a client-provided snapshot if the
  // history row hasn't caught up yet (or the persist for this entry failed
  // earlier). The snapshot carries everything we need to rebuild the prompt
  // and run the image gen — only the daily cap and history attach actually
  // need a DB-resident entry.
  const history = await loadFusionHistory()
  let entry = history.find(e => e.id === entryId)
  if (!entry) {
    const snap = readEntrySnapshot(x.entrySnapshot)
    if (snap && snap.id === entryId) {
      // Persist a synthetic entry so the daily cap counter and history list
      // stay accurate. If THAT also fails, surface the error clearly.
      entry = snap
      try {
        await appendFusionHistoryFromSnapshot(snap)
      } catch (e) {
        console.error('fusion image gen — snapshot persist failed:', e)
        // Continue anyway — image gen itself doesn't need the DB write.
      }
    } else {
      return NextResponse.json({
        error: `Fusion entry ${entryId} not found, and no usable client snapshot was provided. Re-run the deep research and try again.`,
      }, { status: 404 })
    }
  }

  // Reload dataset and locate strands so we can rebuild the original FusionResult deterministically.
  const dataset = await loadIndustryDataset(entry.industryId)
  const baseStrand = dataset.styles.find(s => s.id === entry.baseStyleId)
  const blendStrand = dataset.styles.find(s => s.id === entry.blendStyleId)
  if (!baseStrand || !blendStrand) {
    return NextResponse.json({ error: 'Base or blend strand no longer in dataset' }, { status: 400 })
  }
  const fusion = fuseStyles(
    baseStrand,
    blendStrand,
    {
      baseStyleId: baseStrand.id,
      blendStyleId: blendStrand.id,
      blendWeight: entry.blendWeight,
      socialAccelerant: entry.socialAccelerant,
      anomaly: entry.anomaly,
      extraSignals: entry.extraSignals,
    },
    new Date().getFullYear(),
  )

  // Prefer override → entry's stored visualDescriptor → fall back to engine outlook (handled inside builder).
  const visualDescriptor = visualDescriptorOverride ?? entry.visualDescriptor
  const contentFocus = contentFocusOverride ?? entry.contentFocus

  // Build a chaos level per image. In sweep mode chaos ramps linearly 0→100
  // across the batch, so the images show the design evolving from faithful to
  // experimental. Otherwise every image uses the single requested chaos value.
  const chaosLevels: number[] = chaosSweep
    ? Array.from({ length: count }, (_, i) => (count === 1 ? chaos : Math.round((i / (count - 1)) * 100)))
    : Array.from({ length: count }, () => chaos)
  const prompts = chaosLevels.map(c =>
    buildFusionImagePrompt({ baseStrand, blendStrand, fusion, visualDescriptor, chaos: c, contentFocus, chaosDirection }),
  )

  // Generate (one image per prompt) — parallel with concurrency cap and
  // per-call retry on transient errors so a single hiccup doesn't kill the
  // whole batch.
  let batch
  try {
    // Replicate's free/low-volume tier rate-limits to ~6 req/min with burst=1.
    // Running 3 in parallel guarantees throttling. Keep Gemini/OR at 3.
    const concurrency = isReplicateImageModel(imageModel) ? 1 : 3
    batch = await generateBatchWithConcurrency({ apiKey, prompts, model: imageModel, concurrency })
  } catch (e) {
    console.error('fusion image gen error:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Image generation failed.' },
      { status: 502 },
    )
  }
  const generated = batch.images
  const failures = batch.slots
    .filter(s => !s.image)
    .map(s => ({ index: s.index, chaos: chaosLevels[s.index], error: s.error ?? 'unknown' }))

  // Surface a clean error if literally everything failed — usually a key /
  // auth / quota issue rather than transient infra blips.
  if (generated.length === 0) {
    const firstErr = failures[0]?.error ?? 'Image generation failed.'
    console.error('fusion image gen — all calls failed:', failures)
    return NextResponse.json(
      { error: `All ${prompts.length} image generations failed: ${firstErr}` },
      { status: 502 },
    )
  }

  // Upload each surviving image to Supabase Storage. We walk the per-slot
  // result so each upload carries the right prompt + chaos value (failed
  // slots are skipped).
  const db = getServiceClient()
  await db.storage.createBucket(STORAGE_BUCKET, { public: true }).catch(() => {})
  const uploaded: FusionImageRecord[] = []
  const createdAtBase = Date.now()
  let uploadIdx = 0
  for (const slot of batch.slots) {
    if (!slot.image) continue
    const img = slot.image
    const filename = `${entryId}/${createdAtBase}-${slot.index}.${img.mime === 'image/jpeg' ? 'jpg' : 'png'}`
    const { error: uploadError } = await db.storage
      .from(STORAGE_BUCKET)
      .upload(filename, img.bytes, { contentType: img.mime, upsert: false })
    if (uploadError) {
      console.error('fusion image upload error:', uploadError)
      return NextResponse.json({ error: `Image upload failed: ${uploadError.message}` }, { status: 500 })
    }
    const { data: { publicUrl } } = db.storage.from(STORAGE_BUCKET).getPublicUrl(filename)
    uploaded.push({
      url: publicUrl,
      prompt: prompts[slot.index],
      createdAt: new Date(createdAtBase + uploadIdx).toISOString(),
      model: imageModel,
      chaos: chaosLevels[slot.index],
    })
    uploadIdx++
  }

  // Merge: keep existing images + append new ones.
  // appendFusionImages re-reads inside the call so concurrent generations
  // don't overwrite each other's images.
  const updated = await appendFusionImages(entryId, uploaded)

  return NextResponse.json({
    entry: updated,
    addedCount: uploaded.length,
    requestedCount: prompts.length,
    failures, // [{ index, chaos, error }] — empty when all succeeded
  })
}
