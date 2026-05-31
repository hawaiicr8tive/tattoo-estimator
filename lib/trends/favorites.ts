import { getServiceClient } from '@/lib/supabase'

const KEY = 'image-favorites'

/** Single favorited image record — small intentionally; storage is a flat
 * map keyed by image URL so toggling is O(1). */
export interface FavoriteRecord {
  favoritedAt: string
}

/** Flat map of imageUrl → FavoriteRecord. Stored as a single row in
 * admin_config because the volume is small (a few hundred favorites at
 * most) and reads are bulk. */
export type FavoritesMap = Record<string, FavoriteRecord>

export async function loadFavorites(): Promise<FavoritesMap> {
  try {
    const db = getServiceClient()
    const { data, error } = await db.from('admin_config').select('data').eq('key', KEY).single()
    if (error || !data?.data) return {}
    if (typeof data.data === 'object' && !Array.isArray(data.data)) {
      return data.data as FavoritesMap
    }
    return {}
  } catch {
    return {}
  }
}

export async function setFavorite(url: string, favorite: boolean): Promise<FavoritesMap> {
  const current = await loadFavorites()
  if (favorite) {
    current[url] = { favoritedAt: new Date().toISOString() }
  } else {
    delete current[url]
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
