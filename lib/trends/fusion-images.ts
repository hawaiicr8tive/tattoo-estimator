import { GoogleGenAI } from '@google/genai'
import type { FusionResult, IndustryDataset, StyleStrand } from './types'

export const IMAGE_MODELS = [
  { id: 'gemini-3.1-flash-image-preview', label: 'Nano Banana 2 (Flash)', priceHint: '~$0.07/image · faster' },
  { id: 'gemini-3-pro-image-preview', label: 'Gemini 3 Pro Image', priceHint: '~$0.15/image · higher quality' },
  { id: 'openrouter/openai/gpt-5-image', label: 'GPT-5 Image (OpenRouter)', priceHint: '~$0.08/image · best instruction-following' },
  { id: 'openrouter/recraft/recraft-v3', label: 'Recraft V3 (OpenRouter)', priceHint: '~$0.04/image · illustration / vector style' },
  { id: 'openrouter/recraft/recraft-v4', label: 'Recraft V4 (OpenRouter)', priceHint: '~$0.05/image · 1K · stronger composition + text' },
  { id: 'openrouter/bytedance-seed/seedream-4.5', label: 'Seedream 4.5 (OpenRouter)', priceHint: '~$0.04/image · ByteDance aesthetic' },
  { id: 'openrouter/black-forest-labs/flux.2-max', label: 'FLUX.2 Max (OpenRouter)', priceHint: '~$0.07/MP · best FLUX so far' },
  { id: 'replicate/ideogram-ai/ideogram-v3-turbo', label: 'Ideogram V3 Turbo (Replicate)', priceHint: '~$0.03/image · clean illustration + text · fast' },
  { id: 'replicate/stability-ai/stable-diffusion-3.5-large', label: 'Stable Diffusion 3.5 Large (Replicate)', priceHint: '~$0.04/image · open-source SDXL successor' },
  { id: 'replicate/qwen/qwen-image', label: 'Qwen Image (Replicate)', priceHint: '~$0.02/image · Alibaba aesthetic' },
  { id: 'replicate/nvidia/sana-sprint-1.6b', label: 'NVIDIA SANA-Sprint 1.6B (Replicate)', priceHint: '~$0.01/image · fastest text-to-image' },
] as const

export type ImageModelId = (typeof IMAGE_MODELS)[number]['id']

export const DEFAULT_IMAGE_MODEL: ImageModelId = 'gemini-3.1-flash-image-preview'

export function isValidImageModel(id: unknown): id is ImageModelId {
  return typeof id === 'string' && IMAGE_MODELS.some(m => m.id === id)
}

const OPENROUTER_IMAGE_PREFIX = 'openrouter/'
const REPLICATE_IMAGE_PREFIX = 'replicate/'

/** True for image models routed through OpenRouter rather than Google direct. */
export function isOpenRouterImageModel(model: string): boolean {
  return model.startsWith(OPENROUTER_IMAGE_PREFIX)
}

/** True for image models routed through Replicate. */
export function isReplicateImageModel(model: string): boolean {
  return model.startsWith(REPLICATE_IMAGE_PREFIX)
}

/** Backwards-compat alias — earlier code referenced this name. */
export const NANO_BANANA_MODEL: ImageModelId = DEFAULT_IMAGE_MODEL

export interface FusionImagePromptInput {
  baseStrand: StyleStrand
  blendStrand: StyleStrand
  fusion: FusionResult
  /**
   * Visual descriptor — the ~100-word art-direction note returned by the deep
   * research call. This is the primary signal for image generation; if missing,
   * we fall back to the engine's `outlook` and visual ingredients.
   */
  visualDescriptor?: string
  /** 0-100. Higher values inject deliberate compositional rule-breaking. */
  chaos?: number
  /** Optional motif focus — forced central subject (e.g. "Rose"). */
  contentFocus?: { categoryLabel: string; itemLabel: string }
  /** Optional free-text creative direction layered on top of the numeric chaos
   * value. Used by bulk batches to nudge a whole batch in a specific direction
   * (e.g. "art-nouveau organic flow"). */
  chaosDirection?: string
}

const CHAOS_DIRECTIVES: { min: number; text: string }[] = [
  { min: 75, text: 'Deliberate rule-breaking: unconventional proportions, abstracted forms, unexpected motif placements, experimental linework that reads as intentional art-direction rather than a mistake. Push the composition off-center.' },
  { min: 50, text: 'Compositional risks: noticeable variations in line weight, looser symmetry, an unexpected accent element that surprises but still works on a flash sheet.' },
  { min: 25, text: 'Subtle compositional choices: light variation in line weight, a slightly off-axis composition, one unexpected supporting motif.' },
]

function chaosDirective(chaos: number): string {
  for (const d of CHAOS_DIRECTIVES) if (chaos >= d.min) return d.text
  return ''
}

/**
 * Build a single tattoo-flash image prompt from a fusion. Keeps the prompt
 * inside the design domain (flash-sheet illustration of a tattoo, not a
 * person wearing one) to stay clear of Gemini's body-skin / nudity layer.
 *
 * Primary visual signal is the user-editable `visualDescriptor` field — Claude
 * generates a tight ~100-word art-direction note alongside the prose analysis,
 * specifically for image gen. The prose analysis itself is intentionally NOT
 * included because most of it (market dynamics, comparable history, what could
 * kill it) doesn't translate to image style and dilutes the prompt.
 */
export function buildFusionImagePrompt(input: FusionImagePromptInput): string {
  const { baseStrand, blendStrand, fusion, visualDescriptor, chaos = 0, contentFocus, chaosDirection } = input
  const baseTags = baseStrand.tags.join(', ')
  const blendTags = blendStrand.tags.join(', ')
  const ingredients = fusion.ingredients.slice(0, 3).join('. ')
  const safeDescriptor = visualDescriptor ? sanitizeForImageGen(visualDescriptor).slice(0, 1200) : ''
  const chaosText = chaosDirective(Math.max(0, Math.min(100, Math.round(chaos))))
  const safeDirection = chaosDirection ? sanitizeForImageGen(chaosDirection).slice(0, 400).trim() : ''
  return [
    'A black-ink tattoo flash-sheet design on a clean off-white paper background, photographed top-down. No skin, no body, no person — only the inked design centered on paper.',
    contentFocus ? `Central subject: ${contentFocus.itemLabel} (${contentFocus.categoryLabel}). The design MUST feature this as the primary motif.` : '',
    `Working name: "${fusion.name}".`,
    `Fusion of ${baseStrand.label} (${baseStrand.tagline}) and ${blendStrand.label} (${blendStrand.tagline}).`,
    `Tag mix: ${baseTags} blended with ${blendTags}.`,
    `Visual ingredients: ${ingredients}`,
    safeDescriptor ? `Visual descriptor: ${safeDescriptor}` : `Outlook: ${fusion.outlook}`,
    chaosText ? `Chaos modifier: ${chaosText}` : '',
    safeDirection ? `Creative direction (let this inspiration steer the visual choices while keeping the core composition): ${safeDirection}` : '',
    'Style: traditional flash-sheet illustration, fine ink work, crisp lines, the kind of drawing a tattoo artist pins to a studio wall as reference. Subtle paper texture. No watermarks, no text annotations, no signatures.',
  ].filter(Boolean).join(' ')
}

/**
 * Strip wording that frequently triggers Gemini's Layer 2 image-safety filter
 * for tattoo prompts. We keep tattoo-canon vocabulary (skull, snake, dagger,
 * blood-drops as a stylistic motif) but replace medical/violent words.
 */
function sanitizeForImageGen(text: string): string {
  return text
    .replace(/\bgore\b/gi, 'dark imagery')
    .replace(/\bgory\b/gi, 'dark')
    .replace(/\bwound(s|ed|ing)?\b/gi, 'mark')
    .replace(/\bcorpse(s)?\b/gi, 'figure')
    .replace(/\bcadaver(s)?\b/gi, 'figure')
    .replace(/\bgraphic violence\b/gi, 'dramatic imagery')
    .replace(/\bbleeding\b/gi, 'ink-dripping')
}

export interface GenerateFusionImagesOptions {
  apiKey: string
  prompt: string
  count: number
  /** Defaults to Nano Banana 2. */
  model?: ImageModelId
}

export interface GeneratedImage {
  /** PNG bytes from Gemini. Caller decides whether to save. */
  bytes: Buffer
  /** Mime type Gemini reports — typically "image/png". */
  mime: string
}

async function generateOneGemini(apiKey: string, model: ImageModelId, prompt: string): Promise<GeneratedImage> {
  // Defaults are fine for most tattoo prompts. The image-prefixed HarmCategory
  // enum members in the SDK aren't accepted by the v1beta endpoint as of writing.
  // If you start hitting Layer-1 blocks for benign tattoo motifs, the workaround
  // is to send safetySettings as raw strings using the non-image-prefixed names
  // (e.g. category: 'HARM_CATEGORY_DANGEROUS_CONTENT') with an 'as never' cast.
  const ai = new GoogleGenAI({ apiKey })
  const res = await ai.models.generateContent({ model, contents: prompt })

  const parts = res.candidates?.[0]?.content?.parts ?? []
  const imagePart = parts.find(p => p.inlineData?.data && p.inlineData?.mimeType?.startsWith('image/'))
  if (!imagePart?.inlineData?.data) {
    // Layer 2 filter or empty response — surface the reason if present.
    const reason = res.promptFeedback?.blockReason || res.candidates?.[0]?.finishReason || 'no_image_returned'
    throw new Error(`Image generation blocked or empty (${reason})`)
  }
  return {
    bytes: Buffer.from(imagePart.inlineData.data, 'base64'),
    mime: imagePart.inlineData.mimeType ?? 'image/png',
  }
}

/**
 * Extract a usable image (base64 data URL or remote https URL) from an
 * OpenRouter chat-completion response. Different image models put the image
 * in slightly different fields — message.images, message.content array of
 * parts, or a single content string with a data URL. Try all of them.
 */
function extractImageRefFromOpenRouter(message: unknown): string | null {
  if (!message || typeof message !== 'object') return null
  const m = message as Record<string, unknown>
  const candidates: unknown[] = []
  if (Array.isArray(m.images)) candidates.push(...m.images)
  if (Array.isArray(m.content)) candidates.push(...m.content)
  if (typeof m.content === 'string' && m.content.startsWith('data:image/')) return m.content
  for (const c of candidates) {
    if (!c || typeof c !== 'object') continue
    const part = c as Record<string, unknown>
    const inner = part.image_url
    let url: string | null = null
    if (typeof inner === 'string') url = inner
    else if (inner && typeof inner === 'object' && typeof (inner as { url?: unknown }).url === 'string') url = (inner as { url: string }).url
    else if (typeof part.url === 'string') url = part.url as string
    if (url && (url.startsWith('data:image/') || url.startsWith('http'))) return url
  }
  return null
}

async function generateOneOpenRouter(apiKey: string, model: ImageModelId, prompt: string): Promise<GeneratedImage> {
  const realModel = model.slice(OPENROUTER_IMAGE_PREFIX.length)
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://style-prediction-model.vercel.app',
      'X-Title': 'Style Prediction Model',
    },
    body: JSON.stringify({
      model: realModel,
      messages: [{ role: 'user', content: prompt }],
      // Image-only modality so pure image generators (FLUX) accept it. Models
      // that can also emit text (e.g. Gemini Image) still happily honour this.
      modalities: ['image'],
    }),
  })
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    let msg = errText.slice(0, 500)
    try {
      const parsed = JSON.parse(errText)
      if (parsed?.error?.message) msg = parsed.error.message
    } catch { /* keep raw */ }
    throw new Error(`OpenRouter image error (${res.status}): ${msg}`)
  }
  const data = await res.json()
  const ref = extractImageRefFromOpenRouter(data?.choices?.[0]?.message)
  if (!ref) throw new Error('OpenRouter image response had no usable image data.')

  // data URL → decode in-place; remote URL → fetch the bytes.
  if (ref.startsWith('data:image/')) {
    const match = ref.match(/^data:(image\/[\w+.-]+);base64,(.+)$/)
    if (!match) throw new Error('OpenRouter returned a malformed data URL.')
    return { bytes: Buffer.from(match[2], 'base64'), mime: match[1] }
  }
  const imgRes = await fetch(ref)
  if (!imgRes.ok) throw new Error(`Failed to download hosted image (${imgRes.status})`)
  const buf = Buffer.from(await imgRes.arrayBuffer())
  const mime = imgRes.headers.get('content-type') ?? 'image/png'
  return { bytes: buf, mime }
}

/**
 * Generate a single image via Replicate's hosted-model API. Uses the
 * synchronous "Prefer: wait" header so models that finish under ~60s come
 * back in one round-trip. For slower models we fall back to polling the
 * prediction endpoint.
 *
 * Replicate's input schema varies per model — most modern image models
 * accept `{ prompt }` as the only required field. We pass nothing else so
 * each model uses its own defaults (size, steps, sampler, etc.).
 */
async function generateOneReplicate(apiKey: string, model: ImageModelId, prompt: string): Promise<GeneratedImage> {
  const slug = model.slice(REPLICATE_IMAGE_PREFIX.length)
  const [owner, ...rest] = slug.split('/')
  const name = rest.join('/')
  if (!owner || !name) throw new Error(`Bad Replicate model id: ${slug}`)

  const headers = {
    Authorization: `Token ${apiKey}`,
    'Content-Type': 'application/json',
    Prefer: 'wait',
  }

  // First try the official-model endpoint (works for models with a published
  // "official version"). 404 here usually means the model exists but isn't
  // tagged official — community models in particular.
  let res = await fetch(`https://api.replicate.com/v1/models/${owner}/${name}/predictions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ input: { prompt } }),
  })

  // Fallback: look up the latest version of the model and submit via the
  // generic predictions endpoint. Handles community/non-official models.
  if (res.status === 404) {
    const modelRes = await fetch(`https://api.replicate.com/v1/models/${owner}/${name}`, {
      headers: { Authorization: `Token ${apiKey}` },
    })
    if (modelRes.status === 404) {
      throw new Error(`Replicate model "${slug}" not found.`)
    }
    if (!modelRes.ok) {
      throw new Error(`Replicate model lookup failed (${modelRes.status}).`)
    }
    const modelData = await modelRes.json()
    const versionId = modelData?.latest_version?.id
    if (!versionId) {
      throw new Error(`Replicate model "${slug}" has no available version.`)
    }
    res = await fetch(`https://api.replicate.com/v1/predictions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ version: versionId, input: { prompt } }),
    })
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    let msg = errText.slice(0, 500)
    try {
      const parsed = JSON.parse(errText)
      if (parsed?.detail) msg = parsed.detail
      else if (parsed?.title) msg = parsed.title
    } catch { /* keep raw */ }
    throw new Error(`Replicate error (${res.status}): ${msg}`)
  }

  let prediction = await res.json()

  // If the model didn't finish in the Prefer:wait window, poll until done.
  const maxPolls = 60 // 2s * 60 = up to 2 minutes total polling
  for (let i = 0; i < maxPolls && (prediction.status === 'starting' || prediction.status === 'processing'); i++) {
    await sleep(2000)
    const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
      headers: { Authorization: `Token ${apiKey}` },
    })
    if (!pollRes.ok) throw new Error(`Replicate poll error (${pollRes.status})`)
    prediction = await pollRes.json()
  }

  if (prediction.status === 'failed' || prediction.status === 'canceled') {
    throw new Error(`Replicate prediction ${prediction.status}: ${prediction.error ?? 'no detail'}`)
  }
  if (prediction.status !== 'succeeded') {
    throw new Error(`Replicate prediction timed out (status=${prediction.status})`)
  }

  // Output shape varies per model: string URL, array of URLs, or {image, images} object.
  const url = extractReplicateImageUrl(prediction.output)
  if (!url) throw new Error('Replicate response had no usable image URL.')

  if (url.startsWith('data:image/')) {
    const match = url.match(/^data:(image\/[\w+.-]+);base64,(.+)$/)
    if (!match) throw new Error('Replicate returned a malformed data URL.')
    return { bytes: Buffer.from(match[2], 'base64'), mime: match[1] }
  }
  const imgRes = await fetch(url)
  if (!imgRes.ok) throw new Error(`Failed to download Replicate image (${imgRes.status})`)
  const buf = Buffer.from(await imgRes.arrayBuffer())
  const mime = imgRes.headers.get('content-type') ?? 'image/png'
  return { bytes: buf, mime }
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

async function generateOne(apiKey: string, model: ImageModelId, prompt: string): Promise<GeneratedImage> {
  if (isReplicateImageModel(model)) return generateOneReplicate(apiKey, model, prompt)
  if (isOpenRouterImageModel(model)) return generateOneOpenRouter(apiKey, model, prompt)
  return generateOneGemini(apiKey, model, prompt)
}

/** Transient errors that should retry with backoff:
 * - Gemini preview 500/503/504/DEADLINE_EXCEEDED under load
 * - Replicate 429 throttling (resets in ~10s on the free/low-volume tier)
 * - OpenRouter rate-limits */
function isTransientError(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false
  const msg = ((e as { message?: string }).message ?? '').toLowerCase()
  return (
    msg.includes('deadline_exceeded') ||
    msg.includes('deadline exceeded') ||
    msg.includes('internal error') ||
    msg.includes('overloaded') ||
    msg.includes('unavailable') ||
    msg.includes('throttled') ||
    msg.includes('rate limit') ||
    msg.includes('rate-limit') ||
    msg.includes('"code":429') ||
    msg.includes('"code":500') ||
    msg.includes('"code":502') ||
    msg.includes('"code":503') ||
    msg.includes('"code":504') ||
    msg.includes('(429)') ||
    msg.includes('(500)') ||
    msg.includes('(502)') ||
    msg.includes('(503)') ||
    msg.includes('(504)')
  )
}

function isThrottleError(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false
  const msg = ((e as { message?: string }).message ?? '').toLowerCase()
  return msg.includes('throttled') || msg.includes('rate limit') || msg.includes('(429)') || msg.includes('"code":429')
}

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

async function generateOneWithRetry(
  apiKey: string,
  model: ImageModelId,
  prompt: string,
  maxAttempts = 3,
): Promise<GeneratedImage> {
  let lastErr: unknown
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await generateOne(apiKey, model, prompt)
    } catch (e) {
      lastErr = e
      if (attempt >= maxAttempts - 1 || !isTransientError(e)) break
      // Throttling needs a longer wait — Replicate's free tier resets in
      // ~10s; the other transient errors are typically over in a few seconds.
      const baseMs = isThrottleError(e) ? 12000 : 1500
      await sleep(baseMs * Math.pow(2, attempt))
    }
  }
  throw lastErr
}

export async function generateFusionImages(opts: GenerateFusionImagesOptions): Promise<GeneratedImage[]> {
  const { images } = await generateBatchWithConcurrency({
    apiKey: opts.apiKey,
    prompts: Array.from({ length: opts.count }, () => opts.prompt),
    model: opts.model,
  })
  return images
}

export interface GenerateFromPromptsOptions {
  apiKey: string
  /** One image is generated per prompt, in order. */
  prompts: string[]
  model?: ImageModelId
}

/**
 * Generate one image per prompt. Used by the chaos sweep, where each image
 * gets a prompt built at a different chaos level so the batch shows the design
 * evolving from faithful → experimental.
 *
 * Backwards-compat: returns only the successes in order. Drops failures
 * silently — most callers want a list of images, not failure indices.
 */
export async function generateFusionImagesFromPrompts(opts: GenerateFromPromptsOptions): Promise<GeneratedImage[]> {
  const { images } = await generateBatchWithConcurrency(opts)
  return images
}

export interface BatchGenerationResult {
  /** Successful images, in original prompt order (failed slots are skipped). */
  images: GeneratedImage[]
  /** Per-prompt success/failure flags, parallel to the input prompts array. */
  slots: { index: number; image: GeneratedImage | null; error: string | null }[]
}

/**
 * Run image generation in parallel with a small concurrency cap so we don't
 * stampede Gemini's preview infrastructure. Each call has its own retry on
 * transient errors. Returns BOTH the flat successes (for the common case)
 * and per-slot details (for the route handler to attribute failures).
 *
 * Concurrency = 3 by default. Higher = faster total wall-clock but more
 * pressure on the preview backend. Lower = safer but slower.
 */
export async function generateBatchWithConcurrency(opts: GenerateFromPromptsOptions & { concurrency?: number }): Promise<BatchGenerationResult> {
  const model = opts.model ?? DEFAULT_IMAGE_MODEL
  const concurrency = Math.max(1, Math.min(opts.concurrency ?? 3, opts.prompts.length))
  const slots: BatchGenerationResult['slots'] = opts.prompts.map((_, index) => ({ index, image: null, error: null }))

  let next = 0
  async function worker() {
    while (true) {
      const idx = next++
      if (idx >= opts.prompts.length) return
      try {
        slots[idx].image = await generateOneWithRetry(opts.apiKey, model, opts.prompts[idx])
      } catch (e) {
        slots[idx].error = e instanceof Error ? e.message : 'Image generation failed.'
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()))

  const images = slots.flatMap(s => (s.image ? [s.image] : []))
  return { images, slots }
}

export interface FusionImageRecord {
  url: string
  prompt: string
  /** ISO 8601 of generation. */
  createdAt: string
  model: string
  /** Chaos level (0-100) used for this specific image, when known. */
  chaos?: number
}

// Re-export for callers
export type { IndustryDataset, FusionResult, StyleStrand }
