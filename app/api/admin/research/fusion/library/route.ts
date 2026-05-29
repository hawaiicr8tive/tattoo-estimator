import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getServiceClient } from '@/lib/supabase'
import { loadFusionHistory } from '@/lib/trends/fusion-history'
import { loadIndustryDataset } from '@/lib/trends/store'

const STORAGE_BUCKET = 'fusion-images'

export interface LibraryImage {
  /** Stable id for React keys — bucket path. */
  id: string
  /** Public Supabase URL. */
  url: string
  /** Folder/filename inside the bucket. */
  bucketPath: string
  /** Owning fusion entry id (the folder name). */
  fusionEntryId: string
  /** Null when the image is orphaned (no surviving history entry). */
  fusionName: string | null
  industryId: string | null
  industryLabel: string | null
  baseStyleId: string | null
  blendStyleId: string | null
  baseLabel: string | null
  blendLabel: string | null
  model: string | null
  /** 0-100, or null if pre-chaos-sweep image (we didn't record it then). */
  chaos: number | null
  prompt: string | null
  /** ISO 8601 — image generation time when known, else file created_at from storage. */
  createdAt: string
  isOrphan: boolean
}

/**
 * Returns every image in the fusion-images bucket, enriched with fusion
 * metadata from history when available. Bucket folders without a matching
 * history entry surface as `isOrphan: true` with minimal metadata. Sorted
 * newest-first.
 */
export async function GET(req: NextRequest) {
  const denied = requireAdmin(req)
  if (denied) return denied

  const db = getServiceClient()

  const history = await loadFusionHistory()
  const entryById = new Map(history.map(e => [e.id, e]))

  // Cache industry datasets so we can label base/blend strands.
  const industryCache = new Map<string, Awaited<ReturnType<typeof loadIndustryDataset>>>()
  async function getIndustry(industryId: string) {
    if (industryCache.has(industryId)) return industryCache.get(industryId)!
    const ds = await loadIndustryDataset(industryId).catch(() => null)
    if (ds) industryCache.set(industryId, ds)
    return ds
  }
  async function strandLabel(industryId: string, strandId: string): Promise<string | null> {
    const ds = await getIndustry(industryId)
    return ds?.styles.find(s => s.id === strandId)?.label ?? null
  }

  const images: LibraryImage[] = []

  // First pass: images attached to current history entries (full metadata).
  for (const entry of history) {
    if (!entry.images || entry.images.length === 0) continue
    const [baseLabel, blendLabel] = await Promise.all([
      strandLabel(entry.industryId, entry.baseStyleId),
      strandLabel(entry.industryId, entry.blendStyleId),
    ])
    const industry = await getIndustry(entry.industryId)
    for (const img of entry.images) {
      // Reconstruct bucketPath from the URL — Supabase publicUrl ends with /<bucket>/<path>
      const idx = img.url.indexOf(`/${STORAGE_BUCKET}/`)
      const bucketPath = idx >= 0 ? img.url.slice(idx + STORAGE_BUCKET.length + 2) : `${entry.id}/${img.createdAt}`
      images.push({
        id: bucketPath,
        url: img.url,
        bucketPath,
        fusionEntryId: entry.id,
        fusionName: entry.fusionName,
        industryId: entry.industryId,
        industryLabel: industry?.industry.label ?? entry.industryId,
        baseStyleId: entry.baseStyleId,
        blendStyleId: entry.blendStyleId,
        baseLabel,
        blendLabel,
        model: img.model,
        chaos: typeof img.chaos === 'number' ? img.chaos : null,
        prompt: img.prompt,
        createdAt: img.createdAt,
        isOrphan: false,
      })
    }
  }

  // Second pass: orphan folders (bucket has them, history doesn't).
  try {
    const { data: rootEntries, error: rootError } = await db.storage
      .from(STORAGE_BUCKET)
      .list('', { limit: 1000, sortBy: { column: 'name', order: 'desc' } })

    if (!rootError && rootEntries) {
      for (const entry of rootEntries) {
        // Folders come back with no id / null metadata.
        if (entry.id !== null && entry.id !== undefined) continue
        const folderName = entry.name
        if (!folderName || entryById.has(folderName)) continue

        const { data: files, error: filesError } = await db.storage
          .from(STORAGE_BUCKET)
          .list(folderName, { limit: 500, sortBy: { column: 'name', order: 'desc' } })
        if (filesError || !files) continue

        for (const file of files) {
          if (!file.name) continue
          const bucketPath = `${folderName}/${file.name}`
          const { data: { publicUrl } } = db.storage.from(STORAGE_BUCKET).getPublicUrl(bucketPath)
          images.push({
            id: bucketPath,
            url: publicUrl,
            bucketPath,
            fusionEntryId: folderName,
            fusionName: null,
            industryId: null,
            industryLabel: null,
            baseStyleId: null,
            blendStyleId: null,
            baseLabel: null,
            blendLabel: null,
            model: null,
            chaos: null,
            prompt: null,
            createdAt: file.created_at ?? new Date(0).toISOString(),
            isOrphan: true,
          })
        }
      }
    }
  } catch (e) {
    console.error('library bucket list error:', e)
    // Non-fatal — return what we have from history.
  }

  // Sort newest first.
  images.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))

  // Derive filter facets from the result so the UI dropdowns stay in sync.
  const facets = {
    industries: Array.from(new Set(images.map(i => i.industryId).filter((s): s is string => !!s))).sort(),
    models: Array.from(new Set(images.map(i => i.model).filter((s): s is string => !!s))).sort(),
    totalCount: images.length,
    orphanCount: images.filter(i => i.isOrphan).length,
  }

  return NextResponse.json({ images, facets })
}
