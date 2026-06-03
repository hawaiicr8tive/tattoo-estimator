import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'
import flashData from '@/data/flash.json'
import type { FlashItem } from '@/lib/types'

interface ProposedItem {
  id?: string
  title?: string
  image: string
  style?: string
  isColor?: boolean
  price?: number
}

async function currentFlash(db: ReturnType<typeof getServiceClient>): Promise<FlashItem[]> {
  const { data } = await db.from('admin_config').select('data').eq('key', 'flash').single()
  const saved = data?.data
  return Array.isArray(saved) ? (saved as FlashItem[]) : (flashData as FlashItem[])
}

// Append approved crops to the flash library.
export async function POST(req: NextRequest) {
  const denied = requireAdmin(req)
  if (denied) return denied
  try {
    const body = await req.json()
    const items: ProposedItem[] = Array.isArray(body?.items) ? body.items : []
    if (!items.length) return NextResponse.json({ error: 'No items provided' }, { status: 400 })

    const db = getServiceClient()
    const existing = await currentFlash(db)

    const toAdd: FlashItem[] = items
      .filter(it => it && typeof it.image === 'string' && it.image)
      .map(it => ({
        id: it.id || `flash-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: (it.title || 'Untitled flash').slice(0, 120),
        image: it.image,
        style: it.style || '',
        isColor: it.isColor ?? false,
        available: true,
        ...(typeof it.price === 'number' ? { price: it.price } : {}),
      }))

    if (!toAdd.length) return NextResponse.json({ error: 'No valid items' }, { status: 400 })

    const merged = [...existing, ...toAdd]
    const { error } = await db.from('admin_config').upsert({ key: 'flash', data: merged, updated_at: new Date().toISOString() })
    if (error) throw error

    return NextResponse.json({ success: true, added: toAdd.length, total: merged.length })
  } catch (e) {
    console.error('flash append error:', e)
    return NextResponse.json({ error: 'Save failed' }, { status: 500 })
  }
}
