import { GoogleGenAI, type JobState } from '@google/genai'
import { getServiceClient } from '@/lib/supabase'
import { attachFusionImages, loadFusionHistory } from './fusion-history'
import type { FusionImageRecord } from './fusion-images'

const STORAGE_BUCKET = 'fusion-images'
const TABLE = 'fusion_batch_jobs'

/** Models supported by the Gemini Batch API for image generation.
 * The two we expose mirror the real-time dropdown's two Gemini variants. */
export const BATCH_IMAGE_MODELS = [
  // Google Gemini Batch API
  { id: 'gemini-3-pro-image-preview', label: 'Gemini 3 Pro Image', pricePerImage: 0.075 },
  { id: 'gemini-3.1-flash-image-preview', label: 'Nano Banana 2 (Flash)', pricePerImage: 0.035 },
  // OpenAI Batch API (requires OPENAI_API_KEY env var, separate from OpenRouter).
  // gpt-5-image isn't accepted by /v1/batches yet — only gpt-image-1 + DALL-E
  // models are batch-eligible. Users can still hit gpt-5-image via the
  // real-time OpenRouter path in the regular image-model dropdown.
  { id: 'openai/gpt-image-1', label: 'GPT Image 1 (OpenAI)', pricePerImage: 0.04 },
  // Replicate "batch" — Replicate has no batch endpoint, but it's async by
  // design so we fan-out N concurrent predictions and track them as one job.
  // No 50% discount (price is the same as real-time), but the queue-based
  // workflow still helps when you want N variations without watching the page.
  { id: 'replicate/stability-ai/stable-diffusion-3.5-large', label: 'Stable Diffusion 3.5 Large (Replicate)', pricePerImage: 0.04 },
] as const

export type BatchImageModelId = (typeof BATCH_IMAGE_MODELS)[number]['id']

export function isValidBatchModel(id: unknown): id is BatchImageModelId {
  return typeof id === 'string' && BATCH_IMAGE_MODELS.some(m => m.id === id)
}

/** True for batch models routed through OpenAI's Batch API rather than Google's. */
export function isOpenAIBatchModel(model: string): boolean {
  return model.startsWith('openai/')
}

/** True for batch models running as fan-out parallel predictions on Replicate. */
export function isReplicateBatchModel(model: string): boolean {
  return model.startsWith('replicate/')
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

/** Build the JSONL body the Gemini Batch API consumes. One line per request.
 * Each request explicitly asks for IMAGE modality so image-preview models
 * actually produce an image instead of defaulting to text and silently
 * returning empty content. */
function buildBatchJsonl(prompts: string[]): string {
  return prompts
    .map((prompt, i) => JSON.stringify({
      key: `req_${i.toString().padStart(4, '0')}`,
      request: {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ['IMAGE'],
        },
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
  if (isOpenAIBatchModel(opts.model)) {
    return submitOpenAIBatch(opts)
  }
  if (isReplicateBatchModel(opts.model)) {
    return submitReplicateBatch(opts)
  }
  return submitGeminiBatch(opts)
}

async function submitGeminiBatch(opts: SubmitBatchOptions): Promise<BatchJobRow> {
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
export async function pollOpenBatches(apiKey: string, openaiApiKey?: string, replicateApiKey?: string): Promise<PollResult[]> {
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
      if (isReplicateBatchModel(row.model)) {
        if (!replicateApiKey) {
          errMsg = 'REPLICATE_API_TOKEN missing — cannot poll Replicate batch'
        } else {
          const result = await pollAndAttachReplicate(replicateApiKey, row)
          next = result.next
          imagesAdded = result.imagesAdded
          if (result.errMsg) errMsg = result.errMsg
        }
      } else if (isOpenAIBatchModel(row.model)) {
        if (!openaiApiKey) {
          errMsg = 'OPENAI_API_KEY missing — cannot poll OpenAI batch'
        } else {
          const batch = await pollOpenAIBatch(openaiApiKey, row.job_name)
          next = mapOpenAIStatus(batch.status)
          console.log(`fusion batch ${row.id} (model=${row.model}) openai-status=${batch.status}`)
          if (next === 'succeeded' && row.added_image_count < row.count) {
            imagesAdded = await downloadAndAttachOpenAI(openaiApiKey, row, batch)
          }
          if (next === 'failed' || next === 'expired' || next === 'cancelled') {
            errMsg = batch.errors?.data?.[0]?.message ?? `OpenAI batch ${next}`
            console.error(`fusion batch ${row.id} terminal-${next}:`, batch.errors ?? '(no error detail)')
          }
        }
      } else {
        const job = await ai.batches.get({ name: row.job_name })
        const rawState = typeof job.state === 'string' ? job.state : (job.state as { name?: string } | undefined)?.name
        next = mapJobState(rawState)
        console.log(`fusion batch ${row.id} (model=${row.model}) state=${rawState}`)
        if (next === 'succeeded' && row.added_image_count < row.count) {
          imagesAdded = await downloadAndAttach(ai, row, job)
        }
        if (next === 'failed' || next === 'expired' || next === 'cancelled') {
          const errorObj = (job as { error?: { message?: string; code?: number | string } }).error
          errMsg = errorObj?.message ?? 'Batch ended without success'
          console.error(`fusion batch ${row.id} terminal-${next}:`, errorObj ?? '(no error detail)')
        }
      }
    } catch (e) {
      errMsg = e instanceof Error ? e.message : 'Unknown poll error'
      console.error(`fusion batch ${row.id} poll error:`, e)
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

/* ───────────────────────────────────────────────────────────────────────── *
 *  OpenAI Batch API                                                          *
 *  Different shape than Google's batch API but conceptually equivalent:      *
 *    1. Upload JSONL                                                          *
 *    2. Create batch                                                          *
 *    3. Poll status                                                           *
 *    4. Download output JSONL                                                 *
 * ───────────────────────────────────────────────────────────────────────── */

const OPENAI_API_BASE = 'https://api.openai.com/v1'
const OPENAI_PREFIX = 'openai/'

/** Build the JSONL OpenAI's batch API expects. One line per prompt, each with
 * a custom_id (used to correlate output later) and a full image-generations
 * request body. */
function buildOpenAIBatchJsonl(prompts: string[], openaiModel: string): string {
  return prompts
    .map((prompt, i) => JSON.stringify({
      custom_id: `req_${i.toString().padStart(4, '0')}`,
      method: 'POST',
      url: '/v1/images/generations',
      body: {
        model: openaiModel,
        prompt,
        size: '1024x1024',
        quality: 'medium',
        n: 1,
      },
    }))
    .join('\n')
}

async function submitOpenAIBatch(opts: SubmitBatchOptions): Promise<BatchJobRow> {
  const openaiModel = opts.model.slice(OPENAI_PREFIX.length) // 'gpt-image-1' or 'gpt-5-image'
  const jsonl = buildOpenAIBatchJsonl(opts.prompts, openaiModel)

  // 1) Upload the JSONL as a "batch" purpose file.
  const formData = new FormData()
  formData.append('purpose', 'batch')
  formData.append('file', new Blob([jsonl], { type: 'application/jsonl' }), `fusion-${opts.fusionEntryId}-${Date.now()}.jsonl`)
  const uploadRes = await fetch(`${OPENAI_API_BASE}/files`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${opts.apiKey}` },
    body: formData,
  })
  if (!uploadRes.ok) {
    const errText = await uploadRes.text().catch(() => '')
    throw new Error(`OpenAI files upload failed (${uploadRes.status}): ${errText.slice(0, 500)}`)
  }
  const uploadData = await uploadRes.json() as { id?: string }
  if (!uploadData.id) throw new Error('OpenAI files upload returned no file id')

  // 2) Create the batch. completion_window must be '24h' for the discount.
  const batchRes = await fetch(`${OPENAI_API_BASE}/batches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input_file_id: uploadData.id,
      endpoint: '/v1/images/generations',
      completion_window: '24h',
      metadata: { fusion_entry: opts.fusionEntryId },
    }),
  })
  if (!batchRes.ok) {
    const errText = await batchRes.text().catch(() => '')
    throw new Error(`OpenAI batches.create failed (${batchRes.status}): ${errText.slice(0, 500)}`)
  }
  const batchData = await batchRes.json() as { id?: string }
  if (!batchData.id) throw new Error('OpenAI batches.create returned no batch id')

  // 3) Persist to fusion_batch_jobs. The job_name column stores the OpenAI
  // batch id (their equivalent of Google's batch resource name).
  const id = `fb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
  const db = getServiceClient()
  const { data, error } = await db
    .from(TABLE)
    .insert({
      id,
      job_name: batchData.id,
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

/** Map OpenAI's batch status names to our shared BatchJobStatus enum. */
function mapOpenAIStatus(s: string | undefined): BatchJobStatus {
  switch (s) {
    case 'completed': return 'succeeded'
    case 'failed': return 'failed'
    case 'expired': return 'expired'
    case 'cancelled':
    case 'cancelling': return 'cancelled'
    case 'validating':
    case 'in_progress':
    case 'finalizing':
    default: return 'pending'
  }
}

interface OpenAIBatchResponse {
  id: string
  status?: string
  output_file_id?: string
  error_file_id?: string
  errors?: { object: string; data?: Array<{ message?: string }> }
}

async function pollOpenAIBatch(apiKey: string, jobName: string): Promise<OpenAIBatchResponse> {
  const res = await fetch(`${OPENAI_API_BASE}/batches/${encodeURIComponent(jobName)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`OpenAI batch get failed (${res.status}): ${errText.slice(0, 200)}`)
  }
  return res.json() as Promise<OpenAIBatchResponse>
}

/** Download a finished OpenAI batch's output file and upload every image to
 * Supabase Storage. Returns the count of images successfully attached. */
async function downloadAndAttachOpenAI(
  apiKey: string,
  row: BatchJobRow,
  batchData: OpenAIBatchResponse,
): Promise<number> {
  const outputFileId = batchData.output_file_id
  if (!outputFileId) throw new Error('Succeeded batch has no output file id')

  const fileRes = await fetch(`${OPENAI_API_BASE}/files/${encodeURIComponent(outputFileId)}/content`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!fileRes.ok) throw new Error(`Failed to download OpenAI batch result (${fileRes.status})`)
  const text = await fileRes.text()

  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0)
  const db = getServiceClient()
  await db.storage.createBucket(STORAGE_BUCKET, { public: true }).catch(() => {})

  const uploaded: FusionImageRecord[] = []
  const createdAtBase = Date.now()
  const promptByKey = new Map<string, { prompt: string; chaos: number }>()
  buildPromptKeyMap(row).forEach(({ key, prompt, chaos }) => promptByKey.set(key, { prompt, chaos }))

  for (let i = 0; i < lines.length; i++) {
    let parsed: {
      custom_id?: string
      response?: { body?: { data?: Array<{ b64_json?: string; url?: string }> } }
      error?: { message?: string }
    }
    try { parsed = JSON.parse(lines[i]) } catch { continue }
    if (parsed.error?.message) continue
    const datum = parsed.response?.body?.data?.[0]
    if (!datum) continue

    let bytes: Buffer | null = null
    let mime = 'image/png'
    if (datum.b64_json) {
      bytes = Buffer.from(datum.b64_json, 'base64')
    } else if (datum.url) {
      // Some models return a hosted URL — fetch it.
      const imgRes = await fetch(datum.url)
      if (imgRes.ok) {
        bytes = Buffer.from(await imgRes.arrayBuffer())
        const ct = imgRes.headers.get('content-type'); if (ct) mime = ct
      }
    }
    if (!bytes) continue

    const ext = mime === 'image/jpeg' ? 'jpg' : 'png'
    const filename = `${row.fusion_entry_id}/${createdAtBase}-batch-${i}.${ext}`
    const { error: uploadError } = await db.storage
      .from(STORAGE_BUCKET)
      .upload(filename, bytes, { contentType: mime, upsert: false })
    if (uploadError) {
      console.error('OpenAI batch image upload error:', uploadError)
      continue
    }
    const { data: { publicUrl } } = db.storage.from(STORAGE_BUCKET).getPublicUrl(filename)
    const meta = parsed.custom_id ? promptByKey.get(parsed.custom_id) : undefined
    uploaded.push({
      url: publicUrl,
      prompt: meta?.prompt ?? `(OpenAI batch ${row.id} image ${i})`,
      createdAt: new Date(createdAtBase + i).toISOString(),
      model: row.model,
      chaos: meta?.chaos,
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

/* ───────────────────────────────────────────────────────────────────────── *
 *  Replicate (fan-out parallel predictions)                                  *
 *  Replicate has no batch endpoint, but its prediction API is async by       *
 *  design — every call returns a prediction ID you can poll independently.   *
 *  We fan out N parallel predictions at submit time and track all their IDs  *
 *  as a single fusion_batch_jobs row. The job_name column holds a JSON       *
 *  array of prediction IDs.                                                  *
 * ───────────────────────────────────────────────────────────────────────── */

const REPLICATE_API_BASE = 'https://api.replicate.com/v1'
const REPLICATE_PREFIX = 'replicate/'

async function submitReplicateBatch(opts: SubmitBatchOptions): Promise<BatchJobRow> {
  const slug = opts.model.slice(REPLICATE_PREFIX.length) // e.g. "stability-ai/stable-diffusion-3.5-large"
  const [owner, ...rest] = slug.split('/')
  const name = rest.join('/')
  if (!owner || !name) throw new Error(`Bad Replicate model id: ${slug}`)

  // For non-official models we need the latest version hash. Fetch it once.
  let versionId: string | undefined
  const modelRes = await fetch(`${REPLICATE_API_BASE}/models/${owner}/${name}`, {
    headers: { Authorization: `Token ${opts.apiKey}` },
  })
  if (modelRes.ok) {
    const modelData = await modelRes.json()
    versionId = modelData?.latest_version?.id
  }

  // Fire off all predictions in parallel — Replicate handles concurrency.
  // We collect every prediction id even if some failed to create, so the
  // poller can report partial counts accurately.
  const predictionIds: string[] = []
  const createErrors: string[] = []
  await Promise.all(opts.prompts.map(async (prompt) => {
    try {
      // Use model endpoint when official, version endpoint as fallback for
      // community models without a stable "official" tag.
      const useModelEndpoint = !versionId
      const url = useModelEndpoint
        ? `${REPLICATE_API_BASE}/models/${owner}/${name}/predictions`
        : `${REPLICATE_API_BASE}/predictions`
      const body = useModelEndpoint
        ? { input: { prompt } }
        : { version: versionId, input: { prompt } }
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Token ${opts.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const errText = await res.text().catch(() => '')
        createErrors.push(`Create failed (${res.status}): ${errText.slice(0, 200)}`)
        return
      }
      const data = await res.json() as { id?: string }
      if (data.id) predictionIds.push(data.id)
    } catch (e) {
      createErrors.push(e instanceof Error ? e.message : 'unknown')
    }
  }))

  if (predictionIds.length === 0) {
    throw new Error(`All ${opts.prompts.length} Replicate predictions failed to create: ${createErrors.slice(0, 3).join('; ')}`)
  }

  // job_name stores the prediction IDs as a JSON array. Stripping any quotes
  // / commas inside isn't a concern — Replicate ids are alphanumeric.
  const id = `fb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
  const db = getServiceClient()
  const { data, error } = await db
    .from(TABLE)
    .insert({
      id,
      job_name: JSON.stringify(predictionIds),
      fusion_entry_id: opts.fusionEntryId,
      industry_id: opts.industryId,
      model: opts.model,
      count: opts.prompts.length,
      chaos_direction: opts.chaosDirection?.trim() || null,
      prompts_jsonl: opts.prompts
        .map((prompt, i) => JSON.stringify({
          key: `req_${i.toString().padStart(4, '0')}`,
          request: { contents: [{ role: 'user', parts: [{ text: prompt }] }] },
        }))
        .join('\n'),
      status: 'pending',
    })
    .select()
    .single()
  if (error) throw new Error(`Failed to persist batch job: ${error.message}`)
  return data as BatchJobRow
}

interface ReplicatePrediction {
  id: string
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled'
  output?: unknown
  error?: string | null
}

function mapReplicateStatus(s: string | undefined): BatchJobStatus {
  switch (s) {
    case 'succeeded': return 'succeeded'
    case 'failed': return 'failed'
    case 'canceled': return 'cancelled'
    case 'starting':
    case 'processing':
    default: return 'pending'
  }
}

function extractReplicateImageUrl(output: unknown): string | null {
  if (typeof output === 'string') return output
  if (Array.isArray(output)) {
    for (const item of output) {
      if (typeof item === 'string' && (item.startsWith('http') || item.startsWith('data:image/'))) return item
    }
  }
  if (output && typeof output === 'object') {
    const o = output as Record<string, unknown>
    if (typeof o.image === 'string') return o.image
    if (Array.isArray(o.images)) {
      for (const item of o.images) {
        if (typeof item === 'string') return item
      }
    }
    if (typeof o.url === 'string') return o.url
  }
  return null
}

/** Poll every prediction in the Replicate batch in parallel, attach finished
 * images, and roll up the overall batch status. Returns count of newly
 * attached images. */
async function pollAndAttachReplicate(apiKey: string, row: BatchJobRow): Promise<{ next: BatchJobStatus; imagesAdded: number; errMsg?: string }> {
  let predictionIds: string[]
  try { predictionIds = JSON.parse(row.job_name) as string[] }
  catch { return { next: 'failed', imagesAdded: 0, errMsg: 'corrupt prediction-id list' } }

  // Fetch every prediction status in parallel.
  const predictions: (ReplicatePrediction | null)[] = await Promise.all(
    predictionIds.map(async (id) => {
      try {
        const res = await fetch(`${REPLICATE_API_BASE}/predictions/${id}`, {
          headers: { Authorization: `Token ${apiKey}` },
        })
        if (!res.ok) return null
        return await res.json() as ReplicatePrediction
      } catch { return null }
    }),
  )

  const succeeded = predictions.filter(p => p?.status === 'succeeded')
  const terminalFailed = predictions.filter(p => p && (p.status === 'failed' || p.status === 'canceled'))
  const stillPending = predictions.filter(p => p && (p.status === 'starting' || p.status === 'processing'))

  // Rebuild prompt-by-key map from the stored JSONL so we can attach
  // metadata to each new image.
  const promptMeta = buildPromptKeyMap(row)

  // Upload + attach any newly succeeded predictions we haven't recorded yet.
  // row.added_image_count is the count we've already attached on previous polls,
  // so we skip the first N succeeded ones.
  const db = getServiceClient()
  await db.storage.createBucket(STORAGE_BUCKET, { public: true }).catch(() => {})
  const newSucceeded = succeeded.slice(row.added_image_count)
  const uploaded: FusionImageRecord[] = []
  const createdAtBase = Date.now()
  for (let i = 0; i < newSucceeded.length; i++) {
    const pred = newSucceeded[i]
    if (!pred) continue
    const url = extractReplicateImageUrl(pred.output)
    if (!url) continue
    let bytes: Buffer
    let mime = 'image/png'
    if (url.startsWith('data:image/')) {
      const m = url.match(/^data:(image\/[\w+.-]+);base64,(.+)$/)
      if (!m) continue
      bytes = Buffer.from(m[2], 'base64')
      mime = m[1]
    } else {
      const imgRes = await fetch(url)
      if (!imgRes.ok) continue
      bytes = Buffer.from(await imgRes.arrayBuffer())
      const ct = imgRes.headers.get('content-type'); if (ct) mime = ct
    }
    const ext = mime === 'image/jpeg' ? 'jpg' : 'png'
    const slotIndex = row.added_image_count + i
    const filename = `${row.fusion_entry_id}/${createdAtBase}-replicate-${slotIndex}.${ext}`
    const { error: uploadError } = await db.storage
      .from(STORAGE_BUCKET)
      .upload(filename, bytes, { contentType: mime, upsert: false })
    if (uploadError) {
      console.error('Replicate batch image upload error:', uploadError)
      continue
    }
    const { data: { publicUrl } } = db.storage.from(STORAGE_BUCKET).getPublicUrl(filename)
    const meta = promptMeta[slotIndex]
    uploaded.push({
      url: publicUrl,
      prompt: meta?.prompt ?? `(Replicate batch ${row.id} image ${slotIndex})`,
      createdAt: new Date(createdAtBase + i).toISOString(),
      model: row.model,
      chaos: meta?.chaos,
    })
  }

  if (uploaded.length > 0) {
    const history = await loadFusionHistory()
    const entry = history.find(e => e.id === row.fusion_entry_id)
    const existingImages = entry?.images ?? []
    await attachFusionImages(row.fusion_entry_id, [...existingImages, ...uploaded])
  }

  // Roll up the batch status.
  let next: BatchJobStatus
  let errMsg: string | undefined
  if (stillPending.length > 0) {
    next = 'pending'
  } else if (succeeded.length === predictions.length) {
    next = 'succeeded'
  } else if (succeeded.length > 0) {
    // Mix of succeeded + failed = treat as succeeded since user got partial
    // results. The error column captures the failure count for context.
    next = 'succeeded'
    if (terminalFailed.length > 0) {
      errMsg = `${terminalFailed.length}/${predictions.length} predictions failed`
    }
  } else {
    next = 'failed'
    errMsg = terminalFailed[0]?.error ?? 'All Replicate predictions failed'
  }

  console.log(`fusion batch ${row.id} (model=${row.model}) replicate succeeded=${succeeded.length}/${predictions.length} pending=${stillPending.length}`)
  return { next, imagesAdded: uploaded.length, errMsg }
}

// Re-export so callers can use the JobState enum type if needed.
export type { JobState }
