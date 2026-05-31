import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

export const maxDuration = 60

/**
 * Reverse-prompt an existing fusion image. Sends the image URL to a
 * vision-capable LLM (default GPT-5 via OpenRouter) with instructions to
 * produce a tight ~150-word visual descriptor suitable as direct input back
 * into image generation.
 *
 * Used by the Fusion Lab lightbox's "Analyze" button so users can pick a
 * generated image, get an AI-extracted prompt, then optionally use that
 * extracted prompt as the override descriptor for the next generation batch.
 */
export async function POST(req: NextRequest) {
  const denied = requireAdmin(req)
  if (denied) return denied

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OPENROUTER_API_KEY is not configured on the server.' },
      { status: 500 },
    )
  }

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const x = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>

  const imageUrl = typeof x.imageUrl === 'string' ? x.imageUrl : ''
  if (!imageUrl || !(imageUrl.startsWith('http') || imageUrl.startsWith('data:image/'))) {
    return NextResponse.json({ error: 'imageUrl required (http/https or data URL)' }, { status: 400 })
  }
  const model = typeof x.model === 'string' && x.model.startsWith('openai/')
    ? x.model
    : 'openai/gpt-5'

  const systemPrompt = `You are analyzing a tattoo flash-sheet design and producing a tight visual descriptor that could be used as a prompt to recreate something similar.

Produce a single paragraph of 100-150 words covering:
- The subject and its pose/composition
- Line weight and shading style (e.g. fine single-needle, bold traditional, dotwork, blackwork)
- Decorative elements, motifs, framing
- Overall aesthetic style and any cultural/era references you can identify
- Negative/positive space balance

Constraints:
- Only describe what is visually present. No market commentary, history, or non-visual content.
- Write as if briefing an artist about to draw something similar.
- Do NOT mention "the image" or "this design" — write descriptively as if you were the original art director.
- Avoid words like "gore", "wound", "corpse", "bleeding" — they trip image-gen safety filters downstream.

Return ONLY the paragraph. No markdown, no preamble.`

  let res: Response
  try {
    res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://style-prediction-model.vercel.app',
        'X-Title': 'Style Prediction Model',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: systemPrompt },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
        max_tokens: 500,
      }),
    })
  } catch (e) {
    console.error('analyze image network error:', e)
    return NextResponse.json({ error: 'Network error calling OpenRouter' }, { status: 502 })
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    let msg = errText.slice(0, 500)
    try {
      const parsed = JSON.parse(errText)
      if (parsed?.error?.message) msg = parsed.error.message
    } catch { /* keep raw */ }
    return NextResponse.json({ error: `OpenRouter error (${res.status}): ${msg}` }, { status: 502 })
  }

  const data = await res.json()
  const descriptor = data?.choices?.[0]?.message?.content
  if (typeof descriptor !== 'string' || !descriptor.trim()) {
    return NextResponse.json({ error: 'Vision model returned no content' }, { status: 502 })
  }

  return NextResponse.json({
    descriptor: descriptor.trim(),
    model,
    usage: {
      prompt_tokens: data?.usage?.prompt_tokens ?? 0,
      completion_tokens: data?.usage?.completion_tokens ?? 0,
    },
  })
}
