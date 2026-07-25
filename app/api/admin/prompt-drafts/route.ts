import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/admin-auth'
import { addDraft, deleteDraft, loadDrafts, updateDraft } from '@/lib/trends/prompt-drafts'

export async function GET(req: NextRequest) {
  const guard = await requirePermission(req, 'page:controls')
  if ('error' in guard) return guard.error
  try {
    const drafts = await loadDrafts()
    return NextResponse.json({ drafts })
  } catch (e) {
    console.error('load drafts error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Load failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission(req, 'page:controls')
  if ('error' in guard) return guard.error
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const x = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>
  const name = typeof x.name === 'string' ? x.name : ''
  const text = typeof x.text === 'string' ? x.text : ''
  try {
    const drafts = await addDraft(name, text)
    return NextResponse.json({ drafts })
  } catch (e) {
    console.error('add draft error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Add failed' }, { status: 400 })
  }
}

export async function PATCH(req: NextRequest) {
  const guard = await requirePermission(req, 'page:controls')
  if ('error' in guard) return guard.error
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const x = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>
  const id = typeof x.id === 'string' ? x.id : ''
  const name = typeof x.name === 'string' ? x.name : ''
  const text = typeof x.text === 'string' ? x.text : ''
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  try {
    const drafts = await updateDraft(id, name, text)
    return NextResponse.json({ drafts })
  } catch (e) {
    console.error('update draft error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Update failed' }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest) {
  const guard = await requirePermission(req, 'page:controls')
  if ('error' in guard) return guard.error
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  try {
    const drafts = await deleteDraft(id)
    return NextResponse.json({ drafts })
  } catch (e) {
    console.error('delete draft error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Delete failed' }, { status: 500 })
  }
}
