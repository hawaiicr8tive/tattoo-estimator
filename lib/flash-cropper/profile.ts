import Anthropic from '@anthropic-ai/sdk'
import type { CropMode } from './crop'

/**
 * AI auto-sort for flash scans — the kiosk version of profile-flash.mjs, but on
 * Anthropic Claude vision (the model the kiosk already uses) instead of OpenAI.
 * Claude only LOOKS and classifies; it never touches a pixel. The classification
 * decides which deterministic crop the scan gets.
 */

export type SortBucket = CropMode | 'manual'

export interface FlashProfile {
  background: string
  paper_fills_frame: boolean
  margin: string
  orientation: string
  art_style: string
  art_centered: boolean
  drawings: number
  lettering: boolean
  skew: string
  confidence: number
  notes: string
}

// Fast, cheap vision model — analogous to gpt-4o-mini in the original pipeline.
export const PROFILE_MODEL = 'claude-haiku-4-5'

const SYSTEM_PROMPT =
  'You are examining a photo/scan of hand-drawn tattoo flash (black ink on paper). ' +
  'The goal later is to crop it to a clean SQUARE WITHOUT touching the artwork — only the crop and the paper/background. ' +
  'Describe ONLY what you see. ' +
  'For "background": the surface the sheet RESTS ON, visible around its edges. Use "clean_light" ONLY if the paper fills the whole frame, OR the surround is plain seamless white. If ANY table/desk/board/mat is visible around the paper — even pale, light, or slightly-blurred wood/cork — name that surface, NOT clean_light. ' +
  'For "paper_fills_frame": true ONLY if the paper takes up essentially the whole image with little/no surface showing.'

const PROFILE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    background: { type: 'string', enum: ['clean_light', 'wood', 'cork', 'cloth_fabric', 'other_textured', 'busy'] },
    paper_fills_frame: { type: 'boolean' },
    margin: { type: 'string', enum: ['ample', 'medium', 'tight'] },
    orientation: { type: 'string', enum: ['landscape', 'portrait', 'square'] },
    art_style: { type: 'string', enum: ['linework', 'solid_dotwork', 'mixed'] },
    art_centered: { type: 'boolean' },
    drawings: { type: 'integer' },
    lettering: { type: 'boolean' },
    skew: { type: 'string', enum: ['none', 'slight', 'strong'] },
    confidence: { type: 'number' },
    notes: { type: 'string' },
  },
  required: ['background', 'paper_fills_frame', 'margin', 'orientation', 'art_style', 'art_centered', 'drawings', 'lettering', 'skew', 'confidence', 'notes'],
} as const

function firstTextBlock(content: Anthropic.ContentBlock[]): string | null {
  for (const block of content) if (block.type === 'text') return block.text
  return null
}

/** Same routing as sort-by-profile.mjs `bucketFor`. */
export function bucketFor(p: FlashProfile): SortBucket {
  const drawings = Number(p.drawings ?? 1)
  const conf = Number(p.confidence)
  const bg = String(p.background || '').toLowerCase()
  if (drawings !== 1 || (Number.isFinite(conf) && conf < 0.6)) return 'manual'
  if (bg && bg !== 'clean_light') return 'textured'
  return p.paper_fills_frame ? 'fills' : 'margin'
}

export interface ProfileOutcome {
  profile: FlashProfile
  bucket: SortBucket
}

/** Run the vision classifier on a (downscaled) JPEG buffer. */
export async function profileScan(apiKey: string, jpegThumb: Buffer): Promise<ProfileOutcome> {
  const client = new Anthropic({ apiKey })
  const response = await client.messages.create({
    model: PROFILE_MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Profile this flash scan. Return JSON conforming to the schema.' },
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: jpegThumb.toString('base64') } },
        ],
      },
    ],
    output_config: { format: { type: 'json_schema', schema: PROFILE_SCHEMA } },
  })

  const raw = firstTextBlock(response.content)
  if (!raw) throw new Error('Model returned no content')
  const profile = JSON.parse(raw) as FlashProfile
  return { profile, bucket: bucketFor(profile) }
}
