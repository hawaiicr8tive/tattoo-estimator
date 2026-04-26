import { getServiceClient } from '@/lib/supabase'
import { DATASETS, getDataset } from './data'
import type { IndustryDataset, IndustryId } from './types'

const KEY_PREFIX = 'trends:'

function configKey(industryId: string) {
  return `${KEY_PREFIX}${industryId}`
}

/**
 * Load a single industry dataset, preferring saved Supabase rows and falling
 * back to the in-repo seed.
 */
export async function loadIndustryDataset(industryId: string): Promise<IndustryDataset> {
  const seed = getDataset(industryId)
  try {
    const db = getServiceClient()
    const { data, error } = await db
      .from('admin_config')
      .select('data')
      .eq('key', configKey(industryId))
      .single()
    if (error || !data?.data) return seed
    return mergeDataset(seed, data.data as Partial<IndustryDataset>)
  } catch {
    return seed
  }
}

/**
 * Load every supported industry dataset.
 */
export async function loadAllDatasets(): Promise<IndustryDataset[]> {
  const ids: IndustryId[] = ['tattoo', 'fashion', 'music', 'interior']
  const seedMap: Record<string, IndustryDataset> = {
    tattoo: DATASETS.tattoo,
    fashion: DATASETS.fashion,
    music: DATASETS.music,
    interior: DATASETS.interior,
  }
  try {
    const db = getServiceClient()
    const { data, error } = await db
      .from('admin_config')
      .select('key, data')
      .in('key', ids.map(configKey))
    if (error) throw error
    const saved = new Map<string, Partial<IndustryDataset>>()
    for (const row of data ?? []) {
      const id = row.key.replace(KEY_PREFIX, '')
      saved.set(id, row.data as Partial<IndustryDataset>)
    }
    return ids.map(id => mergeDataset(seedMap[id], saved.get(id)))
  } catch {
    return ids.map(id => seedMap[id])
  }
}

export async function saveIndustryDataset(dataset: IndustryDataset): Promise<void> {
  const db = getServiceClient()
  const { error } = await db
    .from('admin_config')
    .upsert({
      key: configKey(dataset.industry.id),
      data: dataset,
      updated_at: new Date().toISOString(),
    })
  if (error) throw error
}

function mergeDataset(seed: IndustryDataset, override?: Partial<IndustryDataset>): IndustryDataset {
  if (!override) return seed
  return {
    industry: { ...seed.industry, ...(override.industry ?? {}) },
    styles: override.styles ?? seed.styles,
    cycleNotes: override.cycleNotes ?? seed.cycleNotes,
    yearRange: override.yearRange ?? seed.yearRange,
  }
}
