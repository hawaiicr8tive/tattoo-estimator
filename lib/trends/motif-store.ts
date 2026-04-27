import { getServiceClient } from '@/lib/supabase'
import { MOTIF_LIBRARY_SEED, type MotifLibrary, type MotifItem, type MotifCategory } from './motif-library'

const KEY = 'motif-library'

/**
 * Returns the merged motif library: the seed shipped in code, with any
 * admin overrides from `admin_config[motif-library]` layered on top.
 *
 * Override semantics:
 * - If a row exists, its `categories` and `items` REPLACE the seed entries
 *   with the same id, and any new ids from the override are appended.
 * - Items / categories present in the seed but missing from the override
 *   stay (so accidental partial overrides don't drop the seed).
 */
export async function loadMotifLibrary(): Promise<MotifLibrary> {
  let override: Partial<MotifLibrary> | null = null
  try {
    const db = getServiceClient()
    const { data, error } = await db.from('admin_config').select('data').eq('key', KEY).single()
    if (!error && data?.data) override = data.data as Partial<MotifLibrary>
  } catch {
    // Falls through to seed.
  }
  if (!override) return MOTIF_LIBRARY_SEED

  const categoryById = new Map<string, MotifCategory>()
  for (const c of MOTIF_LIBRARY_SEED.categories) categoryById.set(c.id, c)
  if (Array.isArray(override.categories)) {
    for (const c of override.categories) {
      if (c && typeof c === 'object' && typeof c.id === 'string' && typeof c.label === 'string') {
        categoryById.set(c.id, c)
      }
    }
  }

  const itemById = new Map<string, MotifItem>()
  for (const i of MOTIF_LIBRARY_SEED.items) itemById.set(i.id, i)
  if (Array.isArray(override.items)) {
    for (const i of override.items) {
      if (i && typeof i === 'object' && typeof i.id === 'string' && typeof i.label === 'string'
          && typeof i.categoryId === 'string' && Array.isArray(i.industries)) {
        itemById.set(i.id, {
          id: i.id,
          label: i.label,
          categoryId: i.categoryId,
          industries: i.industries.filter(s => typeof s === 'string'),
          aliases: Array.isArray(i.aliases) ? i.aliases.filter(s => typeof s === 'string') : undefined,
          description: typeof i.description === 'string' ? i.description : undefined,
        })
      }
    }
  }

  return {
    categories: Array.from(categoryById.values()),
    items: Array.from(itemById.values()),
  }
}

export async function saveMotifLibrary(library: MotifLibrary): Promise<void> {
  const db = getServiceClient()
  const { error } = await db
    .from('admin_config')
    .upsert(
      { key: KEY, data: library, updated_at: new Date().toISOString() },
      { onConflict: 'key' },
    )
  if (error) throw error
}

/**
 * Append items + categories to the existing override (or the seed if no
 * override exists). Used by CSV imports.
 */
export async function mergeImportedItems(newItems: MotifItem[], newCategories: MotifCategory[]): Promise<MotifLibrary> {
  const current = await loadMotifLibrary()
  const merged: MotifLibrary = {
    categories: dedupeById([...current.categories, ...newCategories]),
    items: dedupeById([...current.items, ...newItems]),
  }
  await saveMotifLibrary(merged)
  return merged
}

function dedupeById<T extends { id: string }>(arr: T[]): T[] {
  const map = new Map<string, T>()
  for (const x of arr) map.set(x.id, x)
  return Array.from(map.values())
}
