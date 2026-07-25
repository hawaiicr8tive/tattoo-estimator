import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/admin-auth'
import { loadExported, setExported } from '@/lib/trends/image-exported'

export async function GET(req: NextRequest) {
  const guard = await requirePermission(req, 'page:library')
  if ('error' in guard) return guard.error
  try {
    const exported = await loadExported()
    return NextResponse.json({ exported })
  } catch (e) {
    console.error('load exported error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Load failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission(req, 'library:curate')
  if ('error' in guard) return guard.error
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const x = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>
  const urls = Array.isArray(x.urls)
    ? x.urls.filter((u): u is string => typeof u === 'string' && u.length > 0)
    : []
  const exported = x.exported === true
  if (urls.length === 0) return NextResponse.json({ error: 'urls required' }, { status: 400 })
  if (urls.length > 1000) return NextResponse.json({ error: 'Too many urls in one call (max 1000)' }, { status: 400 })
  try {
    const map = await setExported(urls, exported)
    return NextResponse.json({ exported: map, count: urls.length, action: exported ? 'marked' : 'restored' })
  } catch (e) {
    console.error('set exported error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Update failed' }, { status: 500 })
  }
}
