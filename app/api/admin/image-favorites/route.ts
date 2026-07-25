import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/admin-auth'
import { loadFavorites, setFavorite } from '@/lib/trends/favorites'

export async function GET(req: NextRequest) {
  const guard = await requirePermission(req, 'page:library')
  if ('error' in guard) return guard.error
  try {
    const favorites = await loadFavorites()
    return NextResponse.json({ favorites })
  } catch (e) {
    console.error('load favorites error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Load failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission(req, 'library:curate')
  if ('error' in guard) return guard.error
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const x = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>
  const url = typeof x.url === 'string' ? x.url : ''
  const favorite = x.favorite === true
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 })
  try {
    const favorites = await setFavorite(url, favorite)
    return NextResponse.json({ favorites })
  } catch (e) {
    console.error('set favorite error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Update failed' }, { status: 500 })
  }
}
