import { GoogleGenAI, type JobState } from '@google/genai'
import { getServiceClient } from '@/lib/supabase'
import { attachFusionImages, loadFusionHistory } from './fusion-history'
import type { FusionImageRecord } from './fusion-images'

const STORAGE_BUCKET = 'fusion-images'
const TABLE = 'fusion_batch_jobs'

/** Models supported by the Gemini Batch API for image generation.
 * The two we expose mirror the real-time dropdown's two Gemini variants. */
export const BATCH_IMAGE_MODELS = [
  { id: 'gemini-3-pro-image-preview', label: 'Gemini 3 Pro Image', pricePerImage: 0.075 },
  { id: 'gemini-3.1-flash-image-preview', label: 'Nano Banana 2 (Flash)', pricePerImage: 0.035 },
] as const

export type BatchImageModelId = (typeof BATCH_IMAGE_MODELS)[number]['id']

export function isValidBatchModel(id: unknown): id is BatchImageModelId {
  return typeof id === 'string' && BATCH_IMAGE_MODELS.some(m => m.id === id)
}

export const BATCH_MIN_COUNT = 1
export const BATCH_MAX_COUNT = 50
export const BATCH_DEFAULT_COUNT = 25

export type BatchJobStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled' | 'expired'

export interface BatchJobRow {
  id: string
  job_name: string
  fusion_entry_id: string
  industry_id: string
  model: string
  count: number
  chaos_direction: string | null
  prompts_jsonl: string
  status: BatchJobStatus
  error: string | null
  added_image_count: number
  created_at: string
  updated_at: string
  completed_at: string | null
}

export interface SubmitBatchOptions {
  apiKey: string
  fusionEntryId: string
  industryId: string
  model: BatchImageModelId
  prompts: string[]
  chaosDirection?: string
}

/** Build the JSONL body the Gemini Batch API consumes. One line per request. */
function buildBatchJsonl(prompts: string[]): string {
  return prompts
    .map((prompt, i) => JSON.stringify({
      key: `req_${i.toString().padStart(4, '0')}`,
      request: {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      },
    }))
    .join('\n')
}

/**
 * Submit a batch of prompts to Gemini for async image generation. Uploads the
 * prompts as a JSONL file, kicks off the batch, persists a row in
 * fusion_batch_jobs so the cron poller can pick it up.
 *
 * Returns the persisted job row so the caller can show it in the pending panel
 * immediately without waiting for the next poll.
 */
export async function submitFusionBatch(opts: SubmitBatchOptions): Promise<BatchJobRow> {
  if (opts.prompts.length < BATCH_MIN_COUNT || opts.prompts.length > BATCH_MAX_COUNT) {
    throw new Error(`Batch must be between ${BATCH_MIN_COUNT} and ${BATCH_MAX_COUNT} prompts`)
  }
  const ai = new GoogleGenAI({ apiKey: opts.apiKey })
  const jsonl = buildBatchJsonl(opts.prompts)
  const blob = new Blob([jsonl], { type: 'application/jsonl' })

  const uploaded = await ai.files.upload({
    file: blob,
    config: { displayName: `fusion-${opts.fusionEntryId}-${Date.now()}`, mimeType: 'application/jsonl' },
  })
  if (!uploaded.name) throw new Error('Gemini files.upload returned no file name')

  const job = await ai.batches.create({
    model: opts.model,
    src: uploaded.name,
    config: { displayName: `fusion-batch-${opts.fusionEntryId}-${Date.now()}` },
  })
  if (!job.name) throw new Error('Gemini batches.create returned no job name')

  const id = `fb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
  const db = getServiceClient()
  const { data, error } = await db
    .from(TABLE)
    .insert({
      id,
      job_name: job.name,
      fusion_entry_id: opts.fusionEntryId,
      industry_id: opts.industryId,
      model: opts.model,
      count: opts.prompts.length,
      chaos_direction: opts.chaosDirection?.trim() || null,
      prompts_jsonl: jsonl,
      status: 'pending',
    })
    .select()
    .single()
  if (error) throw new Error(`Failed to persist batch job: ${error.message}`)
  return data as BatchJobRow
}

/** Map a Google batch state name to our shorter status. */
function mapJobState(stateName: string | undefined): BatchJobStatus {
  switch (stateName) {
    case 'JOB_STATE_SUCCEEDED': return 'succeeded'
    case 'JOB_STATE_FAILED': return 'failed'
    case 'JOB_STATE_CANCELLED': return 'cancelled'
    case 'JOB_STATE_EXPIRED': return 'expired'
    case 'JOB_STATE_RUNNING': return 'running'
    case 'JOB_STATE_QUEUED':
    case 'JOB_STATE_PENDING':
    default: return 'pending'
  }
}

const TERMINAL_STATES = new Set<BatchJobStatus>(['succeeded', 'failed', 'cancelled', 'expired'])

export interface PollResult {
  jobId: string
  previousStatus: BatchJobStatus
  newStatus: BatchJobStatus
  imagesAdded: number
  error?: string
}

/**
 * Check the status of every non-terminal batch job, advance it, and on success
 * download + attach the resulting images to its fusion entry.
 *
 * Called by the Vercel cron route every 15 minutes. Idempotent — re-running on
 * a terminal job is a no-op; re-running on a succeeded job that already had
 * its images attached doesn't duplicate them (we check added_image_count).
 */
export async function pollOpenBatches(apiKey: string): Promise<PollResult[]> {
  const db = getServiceClient()
  const { data: openJobs, error } = await db
    .from(TABLE)
    .select('*')
    .in('status', ['pending', 'running'])
    .order('created_at', { ascending: true })
    .limit(50)
  if (error) throw new Error(`Failed to load open batch jobs: ${error.message}`)

  const ai = new GoogleGenAI({ apiKey })
  const results: PollResult[] = []

  for (const row of (openJobs as BatchJobRow[] | null) ?? []) {
    const prev = row.status
    let next: BatchJobStatus = prev
    let imagesAdded = 0
    let errMsg: string | undefined

    try {
      const job = await ai.batches.get({ name: row.job_name })
      next = mapJobState(typeof job.state === 'string' ? job.state : (job.state as { name?: string } | undefined)?.name)

      if (next === 'succeeded' && row.added_image_count < row.count) {
        const added = await downloadAndAttach(ai, row, job)
        imagesAdded = added
      }
      if (next === 'failed' || next === 'expired' || next === 'cancelled') {
        const errorObj = (job as { error?: { message?: string } }).error
        errMsg = errorObj?.message ?? 'Batch ended without success'
      }
    } catch (e) {
      errMsg = e instanceof Error ? e.message : 'Unknown poll error'
      // Don't mark the row terminal on transient poll errors — let the next
      // cron tick retry. Only flip to failed after persistent failure detection,
      // which we can layer in later if we see real cases.
    }

    if (next !== prev || imagesAdded > 0 || errMsg) {
      const patch: Record<string, unknown> = {
        status: next,
        updated_at: new Date().toISOString(),
      }
      if (imagesAdded > 0) patch.added_image_count = row.added_image_count + imagesAdded
      if (TERMINAL_STATES.has(next)) patch.completed_at = new Date().toISOString()
      if (errMsg) patch.error = errMsg.slice(0, 1000)
      await db.from(TABLE).update(patch).eq('id', row.id)
    }

    results.push({ jobId: row.id, previousStatus: prev, newStatus: next, imagesAdded, error: errMsg })
  }

  return results
}

/**
 * Download the result JSONL of a succeeded batch, decode each image, upload to
 * Supabase Storage, and append to the fusion entry's image array.
 */
async function downloadAndAttach(
  ai: GoogleGenAI,
  row: BatchJobRow,
  job: unknown,
): Promise<number> {
  const dest = (job as { dest?: { fileName?: string } }).dest
  const destFile = dest?.fileName
  if (!destFile) throw new Error('Succeeded batch has no destination file')

  // The SDK's files.download writes to disk, which doesn't work in a
  // serverless function. Pull the bytes directly over HTTPS instead — the
  // Gemini Files API exposes raw content via the v1beta endpoint with
  // alt=media. The destFile is already in `files/xxx` resource-name form.
  const filePath = destFile.startsWith('files/') ? destFile : `files/${destFile}`
  const apiKey = (ai as unknown as { apiKey?: string }).apiKey ??
    (ai as unknown as { vertexai?: { apiKey?: string } }).vertexai?.apiKey ??
    process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? ''
  const downloadRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/${filePath}:download?alt=media`, {
    headers: { 'x-goog-api-key': apiKey },
  })
  if (!downloadRes.ok) {
    throw new Error(`Failed to download batch result file (${downloadRes.status})`)
  }
  const text = await downloadRes.text()

  // Result JSONL: one line per request, each `{ key, response: { candidates: [...] } }`
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0)
  const db = getServiceClient()
  await db.storage.createBucket(STORAGE_BUCKET, { public: true }).catch(() => {})

  const uploaded: FusionImageRecord[] = []
  const createdAtBase = Date.now()
  // Match prompt index back to the JSONL key we wrote (req_NNNN) so we can
  // recover the prompt text and (later) per-image chaos value.
  const promptByKey = new Map<string, { prompt: string; chaos: number }>()
  buildPromptKeyMap(row).forEach(({ key, prompt, chaos }) => promptByKey.set(key, { prompt, chaos }))

  for (let i = 0; i < lines.length; i++) {
    let parsed: { key?: string; response?: { candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }> } }> }; error?: { message?: string } }
    try {
      parsed = JSON.parse(lines[i])
    } catch {
      continue
    }
    if (parsed.error?.message) continue // partial-failure on this prompt — skip
    const parts = parsed.response?.candidates?.[0]?.content?.parts ?? []
    const imagePart = parts.find(p => p.inlineData?.data && p.inlineData?.mimeType?.startsWith('image/'))
    if (!imagePart?.inlineData?.data) continue

    const mime = imagePart.inlineData.mimeType ?? 'image/png'
    const ext = mime === 'image/jpeg' ? 'jpg' : 'png'
    const bytes = Buffer.from(imagePart.inlineData.data, 'base64')
    const promptMeta = parsed.key ? promptByKey.get(parsed.key) : undefined
    const filename = `${row.fusion_entry_id}/${createdAtBase}-batch-${i}.${ext}`

    const { error: uploadError } = await db.storage
      .from(STORAGE_BUCKET)
      .upload(filename, bytes, { contentType: mime, upsert: false })
    if (uploadError) {
      console.error('fusion batch image upload error:', uploadError)
      continue
    }
    const { data: { publicUrl } } = db.storage.from(STORAGE_BUCKET).getPublicUrl(filename)
    uploaded.push({
      url: publicUrl,
      prompt: promptMeta?.prompt ?? `(batch ${row.id} image ${i})`,
      createdAt: new Date(createdAtBase + i).toISOString(),
      model: row.model,
      chaos: promptMeta?.chaos,
    })
  }

  if (uploaded.length > 0) {
    const history = await loadFusionHistory()
    const entry = history.find(e => e.id === row.fusion_entry_id)
    const existingImages = entry?.images ?? []
    await attachFusionImages(row.fusion_entry_id, [...existingImages, ...uploaded])
  }
  return uploaded.length
}

/** Rebuild the {key → {prompt, chaos}} map from the stored JSONL so we can
 * attach prompt/chaos metadata to the downloaded images. */
function buildPromptKeyMap(row: BatchJobRow): Array<{ key: string; prompt: string; chaos: number }> {
  const out: Array<{ key: string; prompt: string; chaos: number }> = []
  const lines = row.prompts_jsonl.split(/\r?\n/).filter(l => l.trim().length > 0)
  for (let i = 0; i < lines.length; i++) {
    try {
      const parsed = JSON.parse(lines[i]) as { key?: string; request?: { contents?: Array<{ parts?: Array<{ text?: string }> }> } }
      const key = parsed.key ?? `req_${i.toString().padStart(4, '0')}`
      const prompt = parsed.request?.contents?.[0]?.parts?.[0]?.text ?? ''
      // Reconstruct the ramped chaos value for this slot.
      const chaos = row.count <= 1 ? 0 : Math.round((i / (row.count - 1)) * 100)
      out.push({ key, prompt, chaos })
    } catch { /* skip malformed lines */ }
  }
  return out
}

export async function listBatchJobs(fusionEntryId?: string): Promise<BatchJobRow[]> {
  const db = getServiceClient()
  let q = db.from(TABLE).select('*').order('created_at', { ascending: false }).limit(100)
  if (fusionEntryId) q = q.eq('fusion_entry_id', fusionEntryId)
  const { data, error } = await q
  if (error) throw new Error(`Failed to list batch jobs: ${error.message}`)
  return (data as BatchJobRow[] | null) ?? []
}

// Re-export so callers can use the JobState enum type if needed.
export type { JobState }
