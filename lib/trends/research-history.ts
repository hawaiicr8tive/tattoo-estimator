import { getServiceClient } from '@/lib/supabase'
import type { ResearchResult } from './ai-research'

const HISTORY_KEY = 'trends:research-history'
const MAX_HISTORY = 50

export interface ResearchHistoryEntry {
  id: string
  timestamp: string
  industryId: string
  query: string
  model: string
  reasoning: string
  suggestionCount: number
  appliedIds: string[]
  /** Suggestions kept verbatim so the user can re-review or re-apply. */
  result: ResearchResult
  usage: {
    input_tokens: number
    output_tokens: number
    cache_read_input_tokens: number
    cache_creation_input_tokens: number
  }
}

export async function loadHistory(): Promise<ResearchHistoryEntry[]> {
  try {
    const db = getServiceClient()
    const { data, error } = await db.from('admin_config').select('data').eq('key', HISTORY_KEY).single()
    if (error || !data?.data) return []
    if (!Array.isArray(data.data)) return []
    return data.data as ResearchHistoryEntry[]
  } catch {
    return []
  }
}

export async function appendHistory(entry: ResearchHistoryEntry): Promise<void> {
  const db = getServiceClient()
  const existing = await loadHistory()
  const next = [entry, ...existing].slice(0, MAX_HISTORY)
  const { error } = await db
    .from('admin_config')
    .upsert({ key: HISTORY_KEY, data: next, updated_at: new Date().toISOString() })
  if (error) throw error
}

export async function markApplied(entryId: string, appliedIds: string[]): Promise<void> {
  const db = getServiceClient()
  const existing = await loadHistory()
  const next = existing.map(e =>
    e.id === entryId ? { ...e, appliedIds: Array.from(new Set([...e.appliedIds, ...appliedIds])) } : e,
  )
  const { error } = await db
    .from('admin_config')
    .upsert({ key: HISTORY_KEY, data: next, updated_at: new Date().toISOString() })
  if (error) throw error
}
