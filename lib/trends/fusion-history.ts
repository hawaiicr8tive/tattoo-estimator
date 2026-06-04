import { getServiceClient } from '@/lib/supabase'
import type { FusionImageRecord } from './fusion-images'

const HISTORY_KEY = 'trends:fusion-history'
const MAX_HISTORY = Infinity

export interface FusionHistoryEntry {
  id: string
  timestamp: string
  industryId: string
  baseStyleId: string
  blendStyleId: string
  blendWeight: number
  socialAccelerant: number
  anomaly: number
  extraSignals: string[]
  fusionName: string
  model: string
  analysis: string
  /** ~100-word visual descriptor used as the primary signal for image generation. */
  visualDescriptor?: string
  /** Optional motif focus the user pinned via the library dropdown. */
  contentFocus?: { categoryLabel: string; itemLabel: string }
  usage: {
    input_tokens: number
    output_tokens: number
    cache_read_input_tokens: number
    cache_creation_input_tokens: number
  }
  /** Optional: generated flash-design images attached to this fusion. */
  images?: FusionImageRecord[]
}

export async function loadFusionHistory(): Promise<FusionHistoryEntry[]> {
  try {
    const db = getServiceClient()
    const { data, error } = await db.from('admin_config').select('data').eq('key', HISTORY_KEY).single()
    if (error || !data?.data) return []
    if (!Array.isArray(data.data)) return []
    return data.data as FusionHistoryEntry[]
  } catch {
    return []
  }
}

export async function appendFusionHistory(entry: FusionHistoryEntry): Promise<void> {
  const db = getServiceClient()
  const existing = await loadFusionHistory()
  const next = [entry, ...existing].slice(0, MAX_HISTORY)
  const { error } = await db
    .from('admin_config')
    .upsert(
      { key: HISTORY_KEY, data: next, updated_at: new Date().toISOString() },
      { onConflict: 'key' },
    )
  if (error) throw error
}

/**
 * Attach generated images to an existing fusion history entry. Replaces the
 * `images` array on that entry; everything else stays.
 */
export async function attachFusionImages(entryId: string, images: FusionImageRecord[]): Promise<FusionHistoryEntry | null> {
  const db = getServiceClient()
  const existing = await loadFusionHistory()
  const idx = existing.findIndex(e => e.id === entryId)
  if (idx === -1) return null
  const updated: FusionHistoryEntry = { ...existing[idx], images }
  const next = existing.slice()
  next[idx] = updated
  const { error } = await db
    .from('admin_config')
    .upsert(
      { key: HISTORY_KEY, data: next, updated_at: new Date().toISOString() },
      { onConflict: 'key' },
    )
  if (error) throw error
  return updated
}

/**
 * Append-only version of attachFusionImages — re-reads the current entry
 * inside the function so concurrent generations don't overwrite each other's
 * contributions. Returns the entry with both existing and new images.
 *
 * This is what you want for any path that runs concurrently (real-time
 * generations fired in quick succession, batch jobs polling in parallel, etc).
 */
export async function appendFusionImages(entryId: string, newImages: FusionImageRecord[]): Promise<FusionHistoryEntry | null> {
  if (newImages.length === 0) {
    const all = await loadFusionHistory()
    return all.find(e => e.id === entryId) ?? null
  }
  const db = getServiceClient()
  const existing = await loadFusionHistory()
  const idx = existing.findIndex(e => e.id === entryId)
  if (idx === -1) return null
  const currentImages = existing[idx].images ?? []
  const updated: FusionHistoryEntry = { ...existing[idx], images: [...currentImages, ...newImages] }
  const next = existing.slice()
  next[idx] = updated
  const { error } = await db
    .from('admin_config')
    .upsert(
      { key: HISTORY_KEY, data: next, updated_at: new Date().toISOString() },
      { onConflict: 'key' },
    )
  if (error) throw error
  return updated
}
