import { getServiceClient } from '@/lib/supabase'

const KEY = 'prompt-drafts'

/** A named draft of a secondary descriptor / prompt the user wants to reuse.
 * Heading-driven — the dropdown in Fusion Lab only shows the name, not the
 * body, so users tag drafts with style-specific labels like "Americana
 * Traditional" or "Polynesian Tribal Density". */
export interface PromptDraft {
  id: string
  name: string
  text: string
  createdAt: string
}

export async function loadDrafts(): Promise<PromptDraft[]> {
  try {
    const db = getServiceClient()
    const { data, error } = await db.from('admin_config').select('data').eq('key', KEY).single()
    if (error || !data?.data) return []
    if (!Array.isArray(data.data)) return []
    return (data.data as unknown[])
      .filter((d): d is PromptDraft => {
        if (!d || typeof d !== 'object') return false
        const r = d as Record<string, unknown>
        return typeof r.id === 'string' && typeof r.name === 'string' && typeof r.text === 'string'
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  } catch {
    return []
  }
}

export async function addDraft(name: string, text: string): Promise<PromptDraft[]> {
  if (!name.trim()) throw new Error('Draft name required')
  if (!text.trim()) throw new Error('Draft text required')
  const draft: PromptDraft = {
    id: `pd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    name: name.trim().slice(0, 80),
    text: text.trim(),
    createdAt: new Date().toISOString(),
  }
  const current = await loadDrafts()
  const next = [draft, ...current].slice(0, 200)
  await saveAll(next)
  return next
}

export async function deleteDraft(id: string): Promise<PromptDraft[]> {
  const current = await loadDrafts()
  const next = current.filter(d => d.id !== id)
  await saveAll(next)
  return next
}

async function saveAll(drafts: PromptDraft[]): Promise<void> {
  const db = getServiceClient()
  const { error } = await db
    .from('admin_config')
    .upsert(
      { key: KEY, data: drafts, updated_at: new Date().toISOString() },
      { onConflict: 'key' },
    )
  if (error) throw error
}
