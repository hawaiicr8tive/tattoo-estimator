import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

function authorize(req: NextRequest) {
  const adminKey = process.env.ADMIN_SECRET_KEY
  if (!adminKey) return null
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${adminKey}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

export async function GET(req: NextRequest) {
  const unauthorized = authorize(req)
  if (unauthorized) return unauthorized

  const { searchParams } = req.nextUrl
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const db = getServiceClient()
  let query = db.from('leads').select('*').order('created_at', { ascending: false }).limit(500)

  if (from) query = query.gte('created_at', `${from}T00:00:00.000Z`)
  if (to) query = query.lte('created_at', `${to}T23:59:59.999Z`)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const unauthorized = authorize(req)
  if (unauthorized) return unauthorized

  let ids: unknown
  try {
    const body = await req.json()
    ids = body?.ids
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!Array.isArray(ids) || ids.length === 0 || !ids.every(id => typeof id === 'string')) {
    return NextResponse.json({ error: 'ids must be a non-empty array of strings' }, { status: 400 })
  }

  const db = getServiceClient()
  const { error, count } = await db.from('leads').delete({ count: 'exact' }).in('id', ids as string[])

  if (error) {
    return NextResponse.json({ error: 'Failed to delete leads' }, { status: 500 })
  }

  return NextResponse.json({ deleted: count ?? 0 })
}
