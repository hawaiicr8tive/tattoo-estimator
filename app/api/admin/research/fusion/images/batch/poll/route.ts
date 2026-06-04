import { NextRequest, NextResponse } from 'next/server'
import { pollOpenBatches } from '@/lib/trends/fusion-batch'

export const maxDuration = 300

/**
 * Polled every 15 min by Vercel Cron. Checks every non-terminal fusion_batch_job,
 * advances its status, and on success downloads + attaches the images to the
 * owning fusion entry. Authenticated via the standard Vercel Cron secret
 * header — the regular admin cookie isn't available in a cron context.
 *
 * Manual triggering is also allowed via the admin cookie, so an operator can
 * force a poll from the UI without waiting for the next cron tick.
 */
export async function GET(req: NextRequest) {
  // Auth: either Vercel Cron secret OR admin session.
  const cronSecret = process.env.CRON_SECRET
  const headerSecret = req.headers.get('authorization')
  const isCron = !!cronSecret && headerSecret === `Bearer ${cronSecret}`

  if (!isCron) {
    // Fall back to admin auth for manual pokes from the dashboard.
    const { requireAdmin } = await import('@/lib/admin-auth')
    const denied = requireAdmin(req)
    if (denied) return denied
  }

  // Gemini key is required (most jobs); OpenAI key is optional (only needed
  // if there are OpenAI batch jobs in the open queue).
  const geminiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY
  const openaiKey = process.env.OPENAI_API_KEY
  if (!geminiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY is not configured on the server.' },
      { status: 500 },
    )
  }

  try {
    const results = await pollOpenBatches(geminiKey, openaiKey)
    const summary = {
      polled: results.length,
      advanced: results.filter(r => r.previousStatus !== r.newStatus).length,
      succeeded: results.filter(r => r.newStatus === 'succeeded').length,
      failed: results.filter(r => r.newStatus === 'failed' || r.newStatus === 'cancelled' || r.newStatus === 'expired').length,
      imagesAttached: results.reduce((sum, r) => sum + r.imagesAdded, 0),
    }
    return NextResponse.json({ ok: true, ...summary, results })
  } catch (e) {
    console.error('batch poll error:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Poll failed' },
      { status: 500 },
    )
  }
}
