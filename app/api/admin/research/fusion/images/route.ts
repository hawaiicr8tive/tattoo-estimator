import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getServiceClient } from '@/lib/supabase'
import { attachFusionImages, loadFusionHistory } from '@/lib/trends/fusion-history'
import { loadIndustryDataset } from '@/lib/trends/store'
import {
  buildFusionImagePrompt,
  generateFusionImages,
  NANO_BANANA_MODEL,
  type FusionImageRecord,
} from '@/lib/trends/fusion-images'
import { fuseStyles } from '@/lib/trends/engine'

const STORAGE_BUCKET = 'fusion-images'
const MAX_PER_REQUEST = 4
/** Soft per-day cap to keep accidental loops cheap. */
const MAX_PER_DAY = 30

function clamp(n: unknown, min: number, max: number, fallback: number): number {
  const v = typeof n === 'number' ? n : Number(n)
  if (!Number.isFinite(v)) return fallback
  return Math.max(min, Math.min(max, v))
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

  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY is not configured on the server.' },
      { status: 500 },
    )
  }

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
  const visualDescriptorOverride =
    typeof x.visualDescriptor === 'string' && x.visualDescriptor.trim().length > 0
      ? x.visualDescriptor.slice(0, 2000)
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

  // Load the fusion entry.
  const history = await loadFusionHistory()
  const entry = history.find(e => e.id === entryId)
  if (!entry) {
    return NextResponse.json({ error: `Fusion entry ${entryId} not found` }, { status: 404 })
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
  const prompt = buildFusionImagePrompt({ baseStrand, blendStrand, fusion, visualDescriptor, chaos })

  // Generate.
  let generated
  try {
    generated = await generateFusionImages({ apiKey, prompt, count })
  } catch (e) {
    console.error('fusion image gen error:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Image generation failed.' },
      { status: 502 },
    )
  }

  // Upload each image to Supabase Storage and collect public URLs.
  const db = getServiceClient()
  await db.storage.createBucket(STORAGE_BUCKET, { public: true }).catch(() => {})
  const uploaded: FusionImageRecord[] = []
  const createdAtBase = Date.now()
  for (let i = 0; i < generated.length; i++) {
    const img = generated[i]
    const filename = `${entryId}/${createdAtBase}-${i}.${img.mime === 'image/jpeg' ? 'jpg' : 'png'}`
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
      prompt,
      createdAt: new Date(createdAtBase + i).toISOString(),
      model: NANO_BANANA_MODEL,
    })
  }

  // Merge: keep existing images + append new ones.
  const allImages = [...(entry.images ?? []), ...uploaded]
  const updated = await attachFusionImages(entryId, allImages)

  return NextResponse.json({ entry: updated, addedCount: uploaded.length })
}
