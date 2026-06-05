import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { cancelOpenGeminiBatches } from '@/lib/trends/fusion-batch'

export const maxDuration = 60

/**
 * Cancel every open (pending/running) Gemini batch job. Used to clear stuck
 * batches when Google's queue is dragging — Pro Image queue specifically has
 * stalled for hours at a time. After cancelling, resubmit on Flash.
 *
 * No body required. Returns a summary of what was cancelled.
 */
export async function POST(req: NextRequest) {
  const denied = requireAdmin(req)
  if (denied) return denied
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY is not configured' }, { status: 500 })
  }
  try {
    const results = await cancelOpenGeminiBatches(apiKey)
    return NextResponse.json({
      cancelled: results.length,
      googleAcked: results.filter(r => r.ok).length,
      googleErrored: results.filter(r => !r.ok).length,
      results,
    })
  } catch (e) {
    console.error('cancel batches error:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Cancel failed' },
      { status: 500 },
    )
  }
}
