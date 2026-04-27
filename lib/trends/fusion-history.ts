import { getServiceClient } from '@/lib/supabase'

const HISTORY_KEY = 'trends:fusion-history'
const MAX_HISTORY = 50

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
  usage: {
    input_tokens: number
    output_tokens: number
    cache_read_input_tokens: number
    cache_creation_input_tokens: number
  }
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
