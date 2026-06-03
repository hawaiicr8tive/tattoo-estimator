import { getServiceClient } from '@/lib/supabase'

const KEY = 'image-exported'

export interface ExportedRecord {
  exportedAt: string
}

/** Flat map of imageUrl → ExportedRecord. Same shape as favorites — a single
 * admin_config row is plenty since we expect a few hundred entries even after
 * heavy use. */
export type ExportedMap = Record<string, ExportedRecord>

export async function loadExported(): Promise<ExportedMap> {
  try {
    const db = getServiceClient()
    const { data, error } = await db.from('admin_config').select('data').eq('key', KEY).single()
    if (error || !data?.data) return {}
    if (typeof data.data === 'object' && !Array.isArray(data.data)) {
      return data.data as ExportedMap
    }
    return {}
  } catch {
    return {}
  }
}

/**
 * Bulk-update the exported flag for a set of URLs.
 * - `exported: true`  → adds entries with a fresh exportedAt timestamp
 * - `exported: false` → removes them from the map (restore from exported folder)
 */
export async function setExported(urls: string[], exported: boolean): Promise<ExportedMap> {
  const current = await loadExported()
  const now = new Date().toISOString()
  for (const url of urls) {
    if (typeof url !== 'string' || !url) continue
    if (exported) {
      // Don't overwrite an existing exportedAt — preserves the first-export date.
      if (!current[url]) current[url] = { exportedAt: now }
    } else {
      delete current[url]
    }
  }
  const db = getServiceClient()
  const { error } = await db
    .from('admin_config')
    .upsert(
      { key: KEY, data: current, updated_at: new Date().toISOString() },
      { onConflict: 'key' },
    )
  if (error) throw error
  return current
}
