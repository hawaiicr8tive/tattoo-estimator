import Anthropic from '@anthropic-ai/sdk'
import type { IndustryDataset, StyleStrand } from './types'

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
- Confidence should reflect your honest grounding. 80+ for canonical history, 50-70 for emerging trends, below 50 for speculative pulls.

Return only the structured JSON described by the output schema.`

function describeStrand(s: StyleStrand): string {
  const peaks = s.curve.map(c => `${c.year}:${c.value}`).join(' ')
  const lineage = s.parentId ? ` parent=${s.parentId}` : ''
  const anc = s.ancestors.length > 0 ? ` ancestors=[${s.ancestors.join(',')}]` : ''
  return `- ${s.id} | ${s.label} (${s.tagline}) origin=${s.origin}${lineage}${anc} curve=[${peaks}]`
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
}

export interface RunFusionResearchOutcome {
  analysis: string
  usage: {
    input_tokens: number
    output_tokens: number
    cache_creation_input_tokens: number
    cache_read_input_tokens: number
  }
}

const FUSION_SYSTEM_PROMPT = `You are a trend-cycle research analyst. The user is exploring a hypothetical fusion of two existing strands from their dataset and wants a deep, grounded analysis — not new strand suggestions.

Your output is a 4-6 paragraph prose analysis covering:
1. Who is already producing work in this direction (specific artists, scenes, references where credible).
2. The carrier signals — cultural ingredients, platforms, demographics — that would push this fusion forward.
3. Comparable historical fusions and how they played out (what they peaked at, how long they took, what came after).
4. Likely emergence timeline and the early-adopter window.
5. What could kill it (saturation risk, visible aging at 5-7 years, backlash patterns, generational handoff problems).

Constraints:
- Ground every claim. If you cannot ground a claim, say so plainly. Do not invent artist names or movement timelines.
- Use plain prose. Light Markdown is fine (paragraph breaks, occasional bold). No headings, no bullet lists, no code blocks.
- Do NOT propose new strands. The user has a separate tool for that.
- 400-600 words. Tight, opinionated, useful.`

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
  })

  const text = firstTextBlock(response.content)
  if (!text) throw new Error('Model returned no text content.')

  return {
    analysis: text,
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
  }
}
