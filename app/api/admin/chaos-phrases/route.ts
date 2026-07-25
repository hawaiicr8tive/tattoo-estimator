import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/admin-auth'
import { addChaosPhrase, loadChaosLibrary } from '@/lib/trends/chaos-store'

export async function GET(req: NextRequest) {
  const guard = await requirePermission(req, 'page:dashboard')
  if ('error' in guard) return guard.error
  try {
    const library = await loadChaosLibrary()
    return NextResponse.json(library)
  } catch (e) {
    console.error('load chaos library error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Load failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission(req, 'page:controls')
  if ('error' in guard) return guard.error
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const x = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>
  try {
    const library = await addChaosPhrase({
      phrase: typeof x.phrase === 'string' ? x.phrase : '',
      description: typeof x.description === 'string' ? x.description : undefined,
      categoryId: typeof x.categoryId === 'string' ? x.categoryId : undefined,
      newCategoryLabel: typeof x.newCategoryLabel === 'string' ? x.newCategoryLabel : undefined,
      tagIds: Array.isArray(x.tagIds) ? x.tagIds.filter((t): t is string => typeof t === 'string') : [],
    })
    return NextResponse.json({ library })
  } catch (e) {
    console.error('add chaos phrase error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Add failed' }, { status: 400 })
  }
}
