import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'

const BUCKET = 'artist-photos'
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req)
  if (denied) return denied
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
    if (file.size > MAX_BYTES) return NextResponse.json({ error: 'File too large (max 5 MB)' }, { status: 400 })

    const ext = file.name.split('.').pop() ?? 'jpg'
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const db = getServiceClient()

    // Create bucket if it doesn't exist
    await db.storage.createBucket(BUCKET, { public: true }).catch(() => {})

    const arrayBuffer = await file.arrayBuffer()
    const { error: uploadError } = await db.storage
      .from(BUCKET)
      .upload(filename, arrayBuffer, { contentType: file.type, upsert: false })

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = db.storage.from(BUCKET).getPublicUrl(filename)

    return NextResponse.json({ url: publicUrl })
  } catch (e) {
    console.error('upload-photo error:', e)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
