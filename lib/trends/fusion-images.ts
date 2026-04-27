import { GoogleGenAI } from '@google/genai'
import type { FusionResult, IndustryDataset, StyleStrand } from './types'

export const NANO_BANANA_MODEL = 'gemini-3.1-flash-image-preview'

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
  const { baseStrand, blendStrand, fusion, visualDescriptor, chaos = 0 } = input
  const baseTags = baseStrand.tags.join(', ')
  const blendTags = blendStrand.tags.join(', ')
  const ingredients = fusion.ingredients.slice(0, 3).join('. ')
  const safeDescriptor = visualDescriptor ? sanitizeForImageGen(visualDescriptor).slice(0, 1200) : ''
  const chaosText = chaosDirective(Math.max(0, Math.min(100, Math.round(chaos))))
  return [
    'A black-ink tattoo flash-sheet design on a clean off-white paper background, photographed top-down. No skin, no body, no person — only the inked design centered on paper.',
    `Working name: "${fusion.name}".`,
    `Fusion of ${baseStrand.label} (${baseStrand.tagline}) and ${blendStrand.label} (${blendStrand.tagline}).`,
    `Tag mix: ${baseTags} blended with ${blendTags}.`,
    `Visual ingredients: ${ingredients}`,
    safeDescriptor ? `Visual descriptor: ${safeDescriptor}` : `Outlook: ${fusion.outlook}`,
    chaosText ? `Chaos modifier: ${chaosText}` : '',
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
}

export interface GeneratedImage {
  /** PNG bytes from Gemini. Caller decides whether to save. */
  bytes: Buffer
  /** Mime type Gemini reports — typically "image/png". */
  mime: string
}

export async function generateFusionImages(opts: GenerateFusionImagesOptions): Promise<GeneratedImage[]> {
  const ai = new GoogleGenAI({ apiKey: opts.apiKey })
  const out: GeneratedImage[] = []

  // Gemini image preview returns one image per generateContent call. Loop for variety.
  for (let i = 0; i < opts.count; i++) {
    // Defaults are fine for most tattoo prompts. The image-prefixed HarmCategory
    // enum members in the SDK aren't accepted by the v1beta endpoint as of writing.
    // If you start hitting Layer-1 blocks for benign tattoo motifs, the workaround
    // is to send safetySettings as raw strings using the non-image-prefixed names
    // (e.g. category: 'HARM_CATEGORY_DANGEROUS_CONTENT') with an 'as never' cast.
    const res = await ai.models.generateContent({
      model: NANO_BANANA_MODEL,
      contents: opts.prompt,
    })

    const parts = res.candidates?.[0]?.content?.parts ?? []
    const imagePart = parts.find(p => p.inlineData?.data && p.inlineData?.mimeType?.startsWith('image/'))
    if (!imagePart?.inlineData?.data) {
      // Layer 2 filter or empty response — surface the reason if present.
      const reason = res.promptFeedback?.blockReason || res.candidates?.[0]?.finishReason || 'no_image_returned'
      throw new Error(`Image generation blocked or empty (${reason})`)
    }
    out.push({
      bytes: Buffer.from(imagePart.inlineData.data, 'base64'),
      mime: imagePart.inlineData.mimeType ?? 'image/png',
    })
  }
  return out
}

export interface FusionImageRecord {
  url: string
  prompt: string
  /** ISO 8601 of generation. */
  createdAt: string
  model: string
}

// Re-export for callers
export type { IndustryDataset, FusionResult, StyleStrand }
