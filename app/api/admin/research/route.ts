import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/admin-auth'
import { isOpenRouterModel, isValidModel, runResearch, type ResearchModelId } from '@/lib/trends/ai-research'
import { loadIndustryDataset } from '@/lib/trends/store'
import { appendHistory, loadHistory, markApplied, type ResearchHistoryEntry } from '@/lib/trends/research-history'

function newId(): string {
  return `rh_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export async function GET(req: NextRequest) {
  const guard = await requirePermission(req, 'page:research')
  if ('error' in guard) return guard.error
  const history = await loadHistory()
  return NextResponse.json({ history })
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission(req, 'page:research')
  if ('error' in guard) return guard.error

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const x = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>

  const usingOpenRouter = typeof x.model === 'string' && isOpenRouterModel(x.model)
  const apiKey = usingOpenRouter ? process.env.OPENROUTER_API_KEY : process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: `${usingOpenRouter ? 'OPENROUTER_API_KEY' : 'ANTHROPIC_API_KEY'} is not configured on the server.` },
      { status: 500 },
    )
  }
  const action = typeof x.action === 'string' ? x.action : 'run'

  if (action === 'mark_applied') {
    const entryId = typeof x.entryId === 'string' ? x.entryId : ''
    const appliedIds = Array.isArray(x.appliedIds) ? x.appliedIds.filter((s): s is string => typeof s === 'string') : []
    if (!entryId || appliedIds.length === 0) {
      return NextResponse.json({ error: 'entryId and appliedIds are required' }, { status: 400 })
    }
    try {
      await markApplied(entryId, appliedIds)
      return NextResponse.json({ success: true })
    } catch (e) {
      console.error('mark_applied error:', e)
      return NextResponse.json({ error: 'Failed to update history' }, { status: 500 })
    }
  }

  // Default: run research.
  const industryId = typeof x.industryId === 'string' ? x.industryId : ''
  const query = typeof x.query === 'string' ? x.query.trim() : ''
  const model = isValidModel(x.model) ? (x.model as ResearchModelId) : 'claude-opus-4-7'

  if (!industryId) return NextResponse.json({ error: 'industryId is required' }, { status: 400 })
  if (!query) return NextResponse.json({ error: 'query is required' }, { status: 400 })
  if (query.length > 4000) return NextResponse.json({ error: 'query is too long (max 4000 chars)' }, { status: 400 })

  let dataset
  try {
    dataset = await loadIndustryDataset(industryId)
  } catch (e) {
    console.error('research load dataset error:', e)
    return NextResponse.json({ error: 'Failed to load dataset' }, { status: 500 })
  }

  let outcome
  try {
    outcome = await runResearch({ apiKey, model, query, dataset })
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
    console.error('research run error:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Research call failed.' },
      { status: 500 },
    )
  }

  const entry: ResearchHistoryEntry = {
    id: newId(),
    timestamp: new Date().toISOString(),
    industryId,
    query,
    model,
    reasoning: outcome.result.reasoning,
    suggestionCount: outcome.result.suggestions.length,
    appliedIds: [],
    result: outcome.result,
    usage: outcome.usage,
  }

  try {
    await appendHistory(entry)
  } catch (e) {
    console.error('research append history error:', e)
    // Non-fatal — return the result even if history persistence fails.
  }

  return NextResponse.json({ entry })
}
