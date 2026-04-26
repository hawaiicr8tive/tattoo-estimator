import { NextRequest, NextResponse } from 'next/server'
import { saveIndustryDataset } from '@/lib/trends/store'
import { requireAdmin } from '@/lib/admin-auth'
import type { IndustryDataset } from '@/lib/trends/types'

function isValidId(id: unknown): id is string {
  return typeof id === 'string' && /^[a-z0-9-]+$/.test(id) && id.length > 0
}

function isValidDataset(d: unknown): d is IndustryDataset {
  if (typeof d !== 'object' || d === null) return false
  const x = d as Record<string, unknown>
  if (typeof x.industry !== 'object' || x.industry === null) return false
  const ind = x.industry as Record<string, unknown>
  if (!isValidId(ind.id)) return false
  if (!Array.isArray(x.styles)) return false
  if (!Array.isArray(x.cycleNotes)) return false
  if (typeof x.yearRange !== 'object' || x.yearRange === null) return false
  return true
}

export async function PUT(req: NextRequest) {
  const denied = requireAdmin(req)
  if (denied) return denied
  try {
    const body = await req.json()
    const dataset = body?.dataset
    if (!isValidDataset(dataset)) {
      return NextResponse.json({ error: 'Invalid dataset payload' }, { status: 400 })
    }
    await saveIndustryDataset(dataset)
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('admin trends save error:', e)
    return NextResponse.json({ error: 'Save failed' }, { status: 500 })
  }
}
