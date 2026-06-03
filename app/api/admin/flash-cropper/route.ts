import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'
import { cropImage, thumbForVision, type CropMode } from '@/lib/flash-cropper/crop'
import { profileScan } from '@/lib/flash-cropper/profile'

const BUCKET = 'flash-cropper'
const MAX_BYTES = 30 * 1024 * 1024 // 30 MB — scans can be large
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/tiff']

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req)
  if (denied) return denied

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured on the server.' }, { status: 500 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (file.type && !ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: `Unsupported file type: ${file.type}` }, { status: 400 })
    }
    if (file.size > MAX_BYTES) return NextResponse.json({ error: 'File too large (max 30 MB)' }, { status: 400 })

    const input = Buffer.from(await file.arrayBuffer())

    // 1) AI auto-sort (Claude vision) → bucket
    let bucket, profile
    try {
      const thumb = await thumbForVision(input)
      const outcome = await profileScan(apiKey, thumb)
      bucket = outcome.bucket
      profile = outcome.profile
    } catch (e) {
      if (e instanceof Anthropic.AuthenticationError) {
        return NextResponse.json({ error: 'Anthropic authentication failed — check ANTHROPIC_API_KEY.' }, { status: 502 })
      }
      if (e instanceof Anthropic.RateLimitError) {
        return NextResponse.json({ error: 'Rate limited — retry shortly.' }, { status: 503 })
      }
      console.error('flash-cropper profile error:', e)
      return NextResponse.json({ error: 'AI sort failed for this image' }, { status: 502 })
    }

    // 2) deterministic crop (sharp) — skip for "manual" (multi-drawing / low confidence)
    const id = uid()
    const db = getServiceClient()
    await db.storage.createBucket(BUCKET, { public: true }).catch(() => {})

    // keep the original so rejects can be downloaded and done by hand
    const origExt = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const origPath = `original/${id}.${origExt}`
    await db.storage.from(BUCKET).upload(origPath, input, { contentType: file.type || 'image/jpeg', upsert: false })
    const originalUrl = db.storage.from(BUCKET).getPublicUrl(origPath).data.publicUrl

    let croppedUrl: string | null = null
    if (bucket !== 'manual') {
      const cropped = await cropImage(input, bucket as CropMode)
      const cropPath = `cropped/${id}.jpg`
      const { error: upErr } = await db.storage.from(BUCKET).upload(cropPath, cropped, { contentType: 'image/jpeg', upsert: false })
      if (upErr) throw upErr
      croppedUrl = db.storage.from(BUCKET).getPublicUrl(cropPath).data.publicUrl
    }

    return NextResponse.json({
      id,
      name: file.name,
      bucket,                                   // 'fills' | 'margin' | 'textured' | 'manual'
      status: bucket === 'manual' ? 'manual' : 'pending',
      croppedUrl,
      originalUrl,
      profile,
    })
  } catch (e) {
    console.error('flash-cropper error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Processing failed' }, { status: 500 })
  }
}
