import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { isValidModel, runFusionResearch, type ResearchModelId } from '@/lib/trends/ai-research'
import { loadIndustryDataset } from '@/lib/trends/store'
import { appendFusionHistory, loadFusionHistory, type FusionHistoryEntry } from '@/lib/trends/fusion-history'

function newId(): string {
  return `fr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function readContentFocus(v: unknown): { categoryLabel: string; itemLabel: string } | undefined {
  if (!v || typeof v !== 'object') return undefined
  const o = v as Record<string, unknown>
  if (typeof o.categoryLabel !== 'string' || typeof o.itemLabel !== 'string') return undefined
  if (!o.categoryLabel.trim() || !o.itemLabel.trim()) return undefined
  return { categoryLabel: o.categoryLabel.slice(0, 80), itemLabel: o.itemLabel.slice(0, 80) }
}

function clamp(n: unknown, min: number, max: number, fallback: number): number {
  const v = typeof n === 'number' ? n : Number(n)
  if (!Number.isFinite(v)) return fallback
  return Math.max(min, Math.min(max, v))
}

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req)
  if (denied) return denied
  const history = await loadFusionHistory()
  return NextResponse.json({ history })
}

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req)
  if (denied) return denied

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not configured on the server.' },
      { status: 500 },
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const x = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>

  const industryId = typeof x.industryId === 'string' ? x.industryId : ''
  const baseStyleId = typeof x.baseStyleId === 'string' ? x.baseStyleId : ''
  const blendStyleId = typeof x.blendStyleId === 'string' ? x.blendStyleId : ''
  const blendWeight = clamp(x.blendWeight, 0, 100, 50)
  const socialAccelerant = clamp(x.socialAccelerant, 0, 100, 50)
  const anomaly = clamp(x.anomaly, 0, 100, 50)
  const extraSignals = Array.isArray(x.extraSignals)
    ? x.extraSignals.filter((s): s is string => typeof s === 'string').slice(0, 12)
    : []
  const fusionName = typeof x.fusionName === 'string' ? x.fusionName.slice(0, 200) : ''
  const model: ResearchModelId = isValidModel(x.model) ? (x.model as ResearchModelId) : 'claude-opus-4-7'
  const contentFocus = readContentFocus(x.contentFocus)

  if (!industryId) return NextResponse.json({ error: 'industryId is required' }, { status: 400 })
  if (!baseStyleId || !blendStyleId) {
    return NextResponse.json({ error: 'baseStyleId and blendStyleId are required' }, { status: 400 })
  }

  let dataset
  try {
    dataset = await loadIndustryDataset(industryId)
  } catch (e) {
    console.error('fusion research load dataset error:', e)
    return NextResponse.json({ error: 'Failed to load dataset' }, { status: 500 })
  }

  const baseStrand = dataset.styles.find(s => s.id === baseStyleId)
  const blendStrand = dataset.styles.find(s => s.id === blendStyleId)
  if (!baseStrand || !blendStrand) {
    return NextResponse.json({ error: 'baseStyleId or blendStyleId not found in dataset' }, { status: 400 })
  }

  let outcome
  try {
    outcome = await runFusionResearch({
      apiKey,
      model,
      dataset,
      baseStrand,
      blendStrand,
      blendWeight,
      socialAccelerant,
      anomaly,
      extraSignals,
      fusionName: fusionName || `${baseStrand.label} × ${blendStrand.label}`,
      contentFocus,
    })
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: 'Anthropic authentication failed — check ANTHROPIC_API_KEY.' }, { status: 502 })
    }
    if (e instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: 'Anthropic rate limit hit — retry shortly.' }, { status: 503 })
    }
    if (e instanceof Anthropic.APIError) {
      return NextResponse.json({ error: `Anthropic API error: ${e.message}` }, { status: 502 })
    }
    console.error('fusion research run error:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Fusion research call failed.' },
      { status: 500 },
    )
  }

  const entry: FusionHistoryEntry = {
    id: newId(),
    timestamp: new Date().toISOString(),
    industryId,
    baseStyleId,
    blendStyleId,
    blendWeight,
    socialAccelerant,
    anomaly,
    extraSignals,
    fusionName: fusionName || `${baseStrand.label} × ${blendStrand.label}`,
    model,
    analysis: outcome.analysis,
    visualDescriptor: outcome.visualDescriptor,
    contentFocus,
    usage: outcome.usage,
  }

  try {
    await appendFusionHistory(entry)
  } catch (e) {
    console.error('fusion research append history error:', e)
    // Non-fatal — return the result even if persistence fails.
  }

  return NextResponse.json({ entry })
}
