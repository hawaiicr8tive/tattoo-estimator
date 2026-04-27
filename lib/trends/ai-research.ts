import Anthropic from '@anthropic-ai/sdk'
import type { CulturalTrigger, IndustryDataset, StyleStrand } from './types'

export const RESEARCH_MODELS = [
  { id: 'claude-opus-4-7', label: 'Claude Opus 4.7 (most capable)' },
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (fast + cheap)' },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 (fastest)' },
] as const

export type ResearchModelId = (typeof RESEARCH_MODELS)[number]['id']

export function isValidModel(id: unknown): id is ResearchModelId {
  return typeof id === 'string' && RESEARCH_MODELS.some(m => m.id === id)
}

export interface SuggestedStrand {
  proposed_id: string
  label: string
  tagline: string
  description: string
  origin: number
  parentId?: string
  ancestors: string[]
  curve_points: { year: number; value: number }[]
  signals: string[]
  tags: string[]
  pioneers?: string[]
  triggers?: CulturalTrigger[]
  confidence: number
  rationale: string
}

export interface ResearchResult {
  reasoning: string
  suggestions: SuggestedStrand[]
  cycle_notes_to_add: string[]
}

const SUGGESTION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    reasoning: {
      type: 'string',
      description: 'A short paragraph explaining how you analyzed the dataset and arrived at the suggestions.',
    },
    suggestions: {
      type: 'array',
      description: 'New strands to add to the dataset. May be empty if nothing credible surfaces.',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          proposed_id: { type: 'string', description: 'kebab-case slug for the strand id, must not conflict with existing ids.' },
          label: { type: 'string' },
          tagline: { type: 'string', description: 'A short single-line description.' },
          description: { type: 'string', description: 'A 1-3 sentence description of the strand and its history.' },
          origin: { type: 'integer', description: 'Earliest credible emergence year.' },
          parentId: { type: 'string', description: 'Optional id of a parent strand from the existing dataset (sub-style relationship).' },
          ancestors: { type: 'array', items: { type: 'string' }, description: 'List of existing strand ids this descends from.' },
          curve_points: {
            type: 'array',
            description: 'Sparse popularity curve points (year, value 0-100). Aim for 3-6 points covering peaks and troughs.',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                year: { type: 'integer' },
                value: { type: 'integer', description: '0-100 popularity index.' },
              },
              required: ['year', 'value'],
            },
          },
          signals: { type: 'array', items: { type: 'string' }, description: 'Cultural/temporal signals carrying this strand.' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Free-form grouping tags.' },
          pioneers: { type: 'array', items: { type: 'string' }, description: 'Optional list of canonical artists/scenes.' },
          triggers: {
            type: 'array',
            description: 'Optional cultural events that drove waves (films, celebrities, viral moments). Especially important for walk-in / flash motifs.',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                year: { type: 'integer' },
                name: { type: 'string', description: 'e.g. "Lilo & Stitch (live action)" or "Hailey Bieber G finger tattoo".' },
                medium: { type: 'string', enum: ['film', 'tv', 'music', 'celebrity', 'viral', 'literature', 'sports', 'other'] },
                impact: { type: 'string', enum: ['high', 'medium', 'low'] },
                notes: { type: 'string' },
              },
              required: ['year', 'name', 'medium', 'impact'],
            },
          },
          confidence: { type: 'integer', description: '0-100 confidence the suggestion is grounded in real history.' },
          rationale: { type: 'string', description: 'One sentence explaining why this suggestion is worth adding.' },
        },
        required: ['proposed_id', 'label', 'tagline', 'description', 'origin', 'ancestors', 'curve_points', 'signals', 'tags', 'confidence', 'rationale'],
      },
    },
    cycle_notes_to_add: {
      type: 'array',
      items: { type: 'string' },
      description: 'Optional plain-language observations about cycles in the dataset that the user should record.',
    },
  },
  required: ['reasoning', 'suggestions', 'cycle_notes_to_add'],
} as const

const SYSTEM_PROMPT = `You are a trend-cycle research analyst. The user maintains a structured dataset of style "strands" with hand-tuned popularity curves over time. Your job is to suggest credible new strands or sub-styles that should be added to the dataset based on the user's research query.

Constraints:
- Suggestions must be grounded in real cultural history. Do not invent strands. If nothing credible surfaces, return an empty suggestions array.
- proposed_id must be kebab-case, lowercase, and must not collide with any existing strand id.
- parentId and ancestors must reference existing strand ids verbatim. If you reference a parent, make sure it makes sense as the canonical immediate parent.
- curve_points should reflect actual historical peaks and troughs. Aim for 3-6 points.
- Cycle notes should be the kind of observation a domain expert would record (e.g. "X peaked roughly 22 years before Y resurfaced, suggesting a canonical cycle"). Keep them factual.
- For walk-in / flash motifs especially, attach concrete cultural triggers (film releases, celebrity moments, viral waves) with year, medium, and impact. Triggers explain why a wave happened — they're often the strongest signal for forecasting future motifs.
- Confidence should reflect your honest grounding. 80+ for canonical history, 50-70 for emerging trends, below 50 for speculative pulls.

Return only the structured JSON described by the output schema.`

function describeStrand(s: StyleStrand): string {
  const peaks = s.curve.map(c => `${c.year}:${c.value}`).join(' ')
  const lineage = s.parentId ? ` parent=${s.parentId}` : ''
  const anc = s.ancestors.length > 0 ? ` ancestors=[${s.ancestors.join(',')}]` : ''
  const trig = s.triggers && s.triggers.length > 0
    ? ` triggers=[${s.triggers.map(t => `${t.year} ${t.name} (${t.medium}, ${t.impact})`).join('; ')}]`
    : ''
  return `- ${s.id} | ${s.label} (${s.tagline}) origin=${s.origin}${lineage}${anc} curve=[${peaks}]${trig}`
}

function buildDatasetContext(dataset: IndustryDataset): string {
  const lines = [
    `Industry: ${dataset.industry.label} (${dataset.industry.id})`,
    `Year range: ${dataset.yearRange.start}-${dataset.yearRange.end}`,
    `Existing strands (${dataset.styles.length}):`,
    ...dataset.styles.map(describeStrand),
    '',
    'Existing cycle notes:',
    ...dataset.cycleNotes.map(n => `- ${n}`),
  ]
  return lines.join('\n')
}

function firstTextBlock(content: Anthropic.ContentBlock[]): string | null {
  for (const block of content) {
    if (block.type === 'text') return block.text
  }
  return null
}

/* ------------------------------------------------------------------ */
/* Fusion research                                                     */
/* ------------------------------------------------------------------ */

export interface RunFusionResearchOptions {
  apiKey: string
  model: ResearchModelId
  dataset: IndustryDataset
  baseStrand: StyleStrand
  blendStrand: StyleStrand
  blendWeight: number
  socialAccelerant: number
  anomaly: number
  extraSignals: string[]
  fusionName: string
  /** Optional motif focus from the shared library (Flowers → Rose, etc.). */
  contentFocus?: { categoryLabel: string; itemLabel: string }
}

export interface RunFusionResearchOutcome {
  analysis: string
  visualDescriptor: string
  usage: {
    input_tokens: number
    output_tokens: number
    cache_creation_input_tokens: number
    cache_read_input_tokens: number
  }
}

const FUSION_SYSTEM_PROMPT = `You are a trend-cycle research analyst. The user is exploring a hypothetical fusion of two existing strands from their dataset and wants two outputs returned together.

Output 1 — "analysis": a 4-6 paragraph prose analysis covering:
1. Who is already producing work in this direction (specific artists, scenes, references where credible).
2. The carrier signals — cultural ingredients, platforms, demographics — that would push this fusion forward.
3. Comparable historical fusions and how they played out.
4. Likely emergence timeline and the early-adopter window.
5. What could kill it.

Output 2 — "visualDescriptor": a tight ~100-word visual description of what a tattoo flash design of this fusion would actually LOOK like. Concrete visual elements only — subject matter, line weight, palette/black-ink-only, composition, decorative motifs, surface treatment. NO market commentary, NO history, NO timeline. This text feeds an image generator directly so it must be unambiguous and visually grounded.

Constraints:
- Ground every claim in the analysis. If you cannot ground a claim, say so plainly.
- Light Markdown is fine in the analysis (paragraph breaks, bold). No headings, no bullets.
- Do NOT propose new strands.
- visualDescriptor stays under ~120 words and reads like an art-direction note for a flash sheet.
- Avoid words like "gore", "wound", "corpse" in the visual descriptor — they trip image-gen safety filters.

Return JSON matching the output schema.`

const FUSION_OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    analysis: {
      type: 'string',
      description: 'The grounded 4-6 paragraph prose analysis.',
    },
    visualDescriptor: {
      type: 'string',
      description: 'A ~100-word visual-only description suitable as direct input to an image generator. No market or historical commentary.',
    },
  },
  required: ['analysis', 'visualDescriptor'],
} as const

export async function runFusionResearch(opts: RunFusionResearchOptions): Promise<RunFusionResearchOutcome> {
  const client = new Anthropic({ apiKey: opts.apiKey })
  const datasetContext = buildDatasetContext(opts.dataset)

  const baseShare = 100 - Math.round(opts.blendWeight)
  const blendShare = Math.round(opts.blendWeight)
  const fusionContext = [
    `Hypothetical fusion under analysis:`,
    `- Working name: "${opts.fusionName}"`,
    `- Base strand: ${opts.baseStrand.label} (id=${opts.baseStrand.id}) — ${opts.baseStrand.tagline}`,
    `- Blend strand: ${opts.blendStrand.label} (id=${opts.blendStrand.id}) — ${opts.blendStrand.tagline}`,
    `- Mix: ${baseShare}% base / ${blendShare}% blend`,
    `- Social accelerant: ${Math.round(opts.socialAccelerant)}/100 (higher = more algorithm-amplified)`,
    `- Anomaly / rule-breaking: ${Math.round(opts.anomaly)}/100 (higher = further from canon)`,
    opts.extraSignals.length > 0 ? `- Extra carrier signals supplied by user: ${opts.extraSignals.join(', ')}` : null,
    opts.contentFocus ? `- Primary content focus (a specific motif the user wants the fusion to render): ${opts.contentFocus.itemLabel} (${opts.contentFocus.categoryLabel} category). The visualDescriptor MUST feature this motif as the central subject.` : null,
  ].filter(Boolean).join('\n')

  const response = await client.messages.create({
    model: opts.model,
    max_tokens: 4000,
    thinking: { type: 'adaptive' },
    system: [
      { type: 'text', text: FUSION_SYSTEM_PROMPT },
      // Cache the dataset context — same key as runResearch, so it shares the cache hit window.
      { type: 'text', text: datasetContext, cache_control: { type: 'ephemeral' } },
    ],
    messages: [
      { role: 'user', content: fusionContext },
    ],
    output_config: {
      format: {
        type: 'json_schema',
        schema: FUSION_OUTPUT_SCHEMA,
      },
    },
  })

  const text = firstTextBlock(response.content)
  if (!text) throw new Error('Model returned no text content.')

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (e) {
    throw new Error(`Model returned invalid JSON: ${e instanceof Error ? e.message : 'unknown'}`)
  }
  const obj = (parsed && typeof parsed === 'object' ? parsed : {}) as Record<string, unknown>
  const analysis = typeof obj.analysis === 'string' ? obj.analysis : ''
  const visualDescriptor = typeof obj.visualDescriptor === 'string' ? obj.visualDescriptor : ''
  if (!analysis || !visualDescriptor) throw new Error('Fusion result missing analysis or visualDescriptor.')

  return {
    analysis,
    visualDescriptor,
    usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      cache_creation_input_tokens: response.usage.cache_creation_input_tokens ?? 0,
      cache_read_input_tokens: response.usage.cache_read_input_tokens ?? 0,
    },
  }
}

/* ------------------------------------------------------------------ */
/* Strand-suggestion research                                          */
/* ------------------------------------------------------------------ */

export interface RunResearchOptions {
  apiKey: string
  model: ResearchModelId
  query: string
  dataset: IndustryDataset
}

export interface RunResearchOutcome {
  result: ResearchResult
  raw: string
  usage: {
    input_tokens: number
    output_tokens: number
    cache_creation_input_tokens: number
    cache_read_input_tokens: number
  }
}

export async function runResearch({ apiKey, model, query, dataset }: RunResearchOptions): Promise<RunResearchOutcome> {
  const client = new Anthropic({ apiKey })
  const datasetContext = buildDatasetContext(dataset)

  const response = await client.messages.create({
    model,
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    system: [
      { type: 'text', text: SYSTEM_PROMPT },
      // Cache the dataset context — it's stable per-industry and benefits repeat runs.
      { type: 'text', text: datasetContext, cache_control: { type: 'ephemeral' } },
    ],
    messages: [
      {
        role: 'user',
        content: `Research query: ${query}\n\nReturn your structured analysis as JSON conforming to the output schema.`,
      },
    ],
    output_config: {
      format: {
        type: 'json_schema',
        schema: SUGGESTION_SCHEMA,
      },
    },
  })

  const raw = firstTextBlock(response.content)
  if (!raw) throw new Error('Model returned no text content.')

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (e) {
    throw new Error(`Model returned invalid JSON: ${e instanceof Error ? e.message : 'unknown'}`)
  }

  const result = validateResult(parsed, dataset)

  return {
    result,
    raw,
    usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      cache_creation_input_tokens: response.usage.cache_creation_input_tokens ?? 0,
      cache_read_input_tokens: response.usage.cache_read_input_tokens ?? 0,
    },
  }
}

function validateResult(input: unknown, dataset: IndustryDataset): ResearchResult {
  if (typeof input !== 'object' || input === null) throw new Error('Result is not an object.')
  const r = input as Record<string, unknown>
  const reasoning = typeof r.reasoning === 'string' ? r.reasoning : ''
  const cycleNotes = Array.isArray(r.cycle_notes_to_add) ? r.cycle_notes_to_add.filter(s => typeof s === 'string') : []
  const rawSuggestions = Array.isArray(r.suggestions) ? r.suggestions : []

  const existingIds = new Set(dataset.styles.map(s => s.id))
  const seenIds = new Set<string>()

  const suggestions: SuggestedStrand[] = []
  for (const s of rawSuggestions) {
    if (typeof s !== 'object' || s === null) continue
    const x = s as Record<string, unknown>
    const proposed_id = typeof x.proposed_id === 'string' ? x.proposed_id : ''
    if (!proposed_id || existingIds.has(proposed_id) || seenIds.has(proposed_id)) continue
    seenIds.add(proposed_id)
    const curveRaw = Array.isArray(x.curve_points) ? x.curve_points : []
    const curve_points = curveRaw
      .filter((p): p is { year: number; value: number } =>
        typeof p === 'object' && p !== null && typeof (p as Record<string, unknown>).year === 'number' && typeof (p as Record<string, unknown>).value === 'number',
      )
      .map(p => ({ year: Math.round(p.year), value: Math.max(0, Math.min(100, Math.round(p.value))) }))
    const triggersRaw = Array.isArray(x.triggers) ? x.triggers : []
    const triggers = triggersRaw
      .map((t): SuggestedStrand['triggers'] extends (infer U)[] | undefined ? U | null : null => {
        if (typeof t !== 'object' || t === null) return null
        const tt = t as Record<string, unknown>
        const year = typeof tt.year === 'number' ? Math.round(tt.year) : null
        const name = typeof tt.name === 'string' ? tt.name : null
        const medium = typeof tt.medium === 'string' && ['film','tv','music','celebrity','viral','literature','sports','other'].includes(tt.medium)
          ? (tt.medium as 'film'|'tv'|'music'|'celebrity'|'viral'|'literature'|'sports'|'other') : null
        const impact = typeof tt.impact === 'string' && ['high','medium','low'].includes(tt.impact)
          ? (tt.impact as 'high'|'medium'|'low') : null
        if (year === null || !name || !medium || !impact) return null
        return { year, name, medium, impact, notes: typeof tt.notes === 'string' ? tt.notes : undefined }
      })
      .filter((t): t is NonNullable<typeof t> => t !== null)

    suggestions.push({
      proposed_id,
      label: typeof x.label === 'string' ? x.label : proposed_id,
      tagline: typeof x.tagline === 'string' ? x.tagline : '',
      description: typeof x.description === 'string' ? x.description : '',
      origin: typeof x.origin === 'number' ? Math.round(x.origin) : new Date().getFullYear() - 5,
      parentId: typeof x.parentId === 'string' && existingIds.has(x.parentId) ? x.parentId : undefined,
      ancestors: Array.isArray(x.ancestors) ? x.ancestors.filter((a): a is string => typeof a === 'string' && existingIds.has(a)) : [],
      curve_points,
      signals: Array.isArray(x.signals) ? x.signals.filter((v): v is string => typeof v === 'string') : [],
      tags: Array.isArray(x.tags) ? x.tags.filter((v): v is string => typeof v === 'string') : [],
      pioneers: Array.isArray(x.pioneers) ? x.pioneers.filter((v): v is string => typeof v === 'string') : undefined,
      triggers: triggers.length > 0 ? triggers : undefined,
      confidence: typeof x.confidence === 'number' ? Math.max(0, Math.min(100, Math.round(x.confidence))) : 50,
      rationale: typeof x.rationale === 'string' ? x.rationale : '',
    })
  }

  return { reasoning, suggestions, cycle_notes_to_add: cycleNotes }
}

/**
 * Convert a SuggestedStrand into a real StyleStrand for merging into the dataset.
 */
export function suggestionToStrand(s: SuggestedStrand): StyleStrand {
  return {
    id: s.proposed_id,
    label: s.label,
    tagline: s.tagline,
    description: s.description,
    origin: s.origin,
    parentId: s.parentId,
    ancestors: s.ancestors,
    curve: s.curve_points.slice().sort((a, b) => a.year - b.year),
    signals: s.signals,
    tags: s.tags,
    pioneers: s.pioneers,
    triggers: s.triggers,
  }
}
