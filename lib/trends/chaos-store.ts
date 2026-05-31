import { getServiceClient } from '@/lib/supabase'
import {
  CHAOS_LIBRARY_SEED,
  type ChaosCategory,
  type ChaosPhrase,
  type ChaosPhraseLibrary,
  type ChaosTag,
} from './chaos-phrases'

const KEY = 'chaos-phrases'

/**
 * Returns the merged chaos-phrase library: the seed shipped in code plus any
 * admin overrides/additions from `admin_config[chaos-phrases]`.
 *
 * Merge semantics — same id wins for the override (so users can edit seed
 * entries). Categories, tags, and phrases each merge by id.
 */
export async function loadChaosLibrary(): Promise<ChaosPhraseLibrary> {
  let override: Partial<ChaosPhraseLibrary> | null = null
  try {
    const db = getServiceClient()
    const { data, error } = await db.from('admin_config').select('data').eq('key', KEY).single()
    if (!error && data?.data) override = data.data as Partial<ChaosPhraseLibrary>
  } catch { /* fall through to seed */ }

  if (!override) return CHAOS_LIBRARY_SEED

  const categoryById = new Map<string, ChaosCategory>()
  for (const c of CHAOS_LIBRARY_SEED.categories) categoryById.set(c.id, c)
  if (Array.isArray(override.categories)) {
    for (const c of override.categories) {
      if (c && typeof c.id === 'string' && typeof c.label === 'string') categoryById.set(c.id, c)
    }
  }

  const tagById = new Map<string, ChaosTag>()
  for (const t of CHAOS_LIBRARY_SEED.tags) tagById.set(t.id, t)
  if (Array.isArray(override.tags)) {
    for (const t of override.tags) {
      if (t && typeof t.id === 'string' && typeof t.label === 'string') tagById.set(t.id, t)
    }
  }

  const phraseById = new Map<string, ChaosPhrase>()
  for (const ph of CHAOS_LIBRARY_SEED.phrases) phraseById.set(ph.id, ph)
  if (Array.isArray(override.phrases)) {
    for (const ph of override.phrases) {
      if (ph && typeof ph.id === 'string' && typeof ph.phrase === 'string' && typeof ph.categoryId === 'string') {
        phraseById.set(ph.id, {
          id: ph.id,
          phrase: ph.phrase,
          description: typeof ph.description === 'string' ? ph.description : undefined,
          categoryId: ph.categoryId,
          tagIds: Array.isArray(ph.tagIds) ? ph.tagIds.filter((t): t is string => typeof t === 'string') : [],
        })
      }
    }
  }

  return {
    categories: Array.from(categoryById.values()),
    tags: Array.from(tagById.values()),
    phrases: Array.from(phraseById.values()),
  }
}

export async function saveChaosLibrary(library: ChaosPhraseLibrary): Promise<void> {
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
 * Add a single new phrase. If `categoryId` isn't recognized, create the
 * category from the provided label so users can spin up new groupings inline.
 */
export interface AddPhraseInput {
  phrase: string
  description?: string
  categoryId?: string       // existing category id
  newCategoryLabel?: string // OR a brand-new category label
  tagIds?: string[]
}

function slug(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
}

export async function addChaosPhrase(input: AddPhraseInput): Promise<ChaosPhraseLibrary> {
  const current = await loadChaosLibrary()
  const phraseText = input.phrase.trim()
  if (!phraseText) throw new Error('Phrase text is required.')

  let categoryId = input.categoryId?.trim() ?? ''
  if (!categoryId && input.newCategoryLabel?.trim()) {
    const label = input.newCategoryLabel.trim()
    categoryId = slug(label)
    if (!current.categories.some(c => c.id === categoryId)) {
      current.categories.push({ id: categoryId, label })
    }
  }
  if (!categoryId) throw new Error('Either categoryId or newCategoryLabel is required.')
  if (!current.categories.some(c => c.id === categoryId)) {
    throw new Error(`Category "${categoryId}" not found.`)
  }

  const tagIds = (input.tagIds ?? []).map(t => t.trim()).filter(Boolean)
  const knownTagIds = new Set(current.tags.map(t => t.id))
  const validTagIds = tagIds.filter(t => knownTagIds.has(t))

  // Generate a unique id from the phrase. Append a numeric suffix if it collides.
  let id = slug(phraseText)
  if (!id) id = `phrase-${Date.now().toString(36)}`
  let n = 2
  const existingIds = new Set(current.phrases.map(p => p.id))
  while (existingIds.has(id)) id = `${slug(phraseText)}-${n++}`

  const newPhrase: ChaosPhrase = {
    id,
    phrase: phraseText,
    description: input.description?.trim() || undefined,
    categoryId,
    tagIds: validTagIds,
  }
  current.phrases.push(newPhrase)
  await saveChaosLibrary(current)
  return current
}
