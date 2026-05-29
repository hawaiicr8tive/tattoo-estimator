import { NextRequest, NextResponse } from 'next/server'
import JSZip from 'jszip'
import { requireAdmin } from '@/lib/admin-auth'
import { getServiceClient } from '@/lib/supabase'

const STORAGE_BUCKET = 'fusion-images'
const MAX_PATHS = 100

/**
 * Bundle a selected set of fusion images into a ZIP and stream it back as
 * a download. Caller passes the bucket paths (folderId/filename.png) that
 * appear in the Library grid; we fetch each from Supabase Storage on the
 * server side so the browser doesn't hit CORS issues with per-image download.
 *
 * Paths are flattened in the ZIP (folder/file -> folder__file) so everything
 * lands in one flat archive — the folder name still encodes the fusion id.
 */
export async function POST(req: NextRequest) {
  const denied = requireAdmin(req)
  if (denied) return denied

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const o = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>
  const rawPaths = Array.isArray(o.paths) ? o.paths : []
  const paths = rawPaths
    .filter((p): p is string => typeof p === 'string' && p.length > 0 && !p.includes('..'))
    .slice(0, MAX_PATHS)
  if (paths.length === 0) {
    return NextResponse.json({ error: 'No image paths provided.' }, { status: 400 })
  }
  if (rawPaths.length > MAX_PATHS) {
    return NextResponse.json(
      { error: `Too many images selected — max ${MAX_PATHS} per download.` },
      { status: 400 },
    )
  }

  const db = getServiceClient()
  const zip = new JSZip()
  const failures: string[] = []

  for (const path of paths) {
    const { data, error } = await db.storage.from(STORAGE_BUCKET).download(path)
    if (error || !data) {
      failures.push(path)
      continue
    }
    const buf = Buffer.from(await data.arrayBuffer())
    // Flatten so the ZIP root has one file per image (folder name is preserved
    // in the filename so you can still tell which fusion each came from).
    const flat = path.replace(/\//g, '__')
    zip.file(flat, buf)
  }

  if (Object.keys(zip.files).length === 0) {
    return NextResponse.json(
      { error: 'None of the selected images could be downloaded from storage.' },
      { status: 500 },
    )
  }

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
  const filename = `fusion-library-${new Date().toISOString().slice(0, 10)}.zip`
  return new NextResponse(new Uint8Array(zipBuffer), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': zipBuffer.length.toString(),
      'X-Failed-Count': String(failures.length),
    },
  })
}
