import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/admin-auth'

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
  const guard = await requirePermission(req, 'images:generate')
  if ('error' in guard) return guard.error

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
  // Default to Claude Sonnet 4.6 — best balance of vision detail + price.
  // Sonnet vision describes images at the level of detail the user wants
  // (subject, pose, line weight, shading, palette, mood, style references)
  // without the reasoning-token overhead that gpt-5 has.
  const model = typeof x.model === 'string' && x.model.includes('/')
    ? x.model
    : 'anthropic/claude-sonnet-4.6'

  const systemPrompt = `You are an expert tattoo art director analyzing a tattoo flash-sheet design. Produce a richly detailed visual descriptor (250-400 words) that captures every element needed to recreate this design with high fidelity.

Structure your response as 4-6 flowing paragraphs (no bullet points, no headers) covering:

OVERALL COMPOSITION — the central focal point, the surrounding elements, the positive/negative space balance, the dominant motifs. Identify any visible text/lettering with EXACT wording in quotes.

PRIMARY SUBJECT — the main figure(s) or object(s) in detail. Pose, expression, clothing, hair, anatomy. For objects: form, surface, texture, dimensionality.

DECORATIVE ELEMENTS — borders, frames, banners, flowers, leaves, secondary motifs. How they relate to the main subject. Their styling and placement.

LINE & SHADING TECHNIQUE — specifically named techniques: "thick black outlines", "whip shading", "stipple shading", "single-needle fine line", "dotwork", "blackwork fills", "crosshatching". Identify line weight variations, fill patterns, shading style.

COLOR PALETTE — list every color present and where each is used (dominant vs accent vs background). Note saturation level and any palette references (muted vintage, neon, monochrome blackwork, etc.).

MOOD & STYLE REFERENCES — overall feeling, era references, cultural movements, specific tattoo style identification (American traditional, neo-traditional, fine line, blackwork, dotwork, Japanese irezumi, chicano fine line, etc.).

Constraints:
- Write as flowing paragraphs, NOT bulleted lists or headers.
- Be specific and concrete — "thick black outlines and muted earth-tone fills" not "lines and colors".
- Identify tattoo style references where credible.
- Quote any visible text exactly.
- Avoid the words "gore", "wound", "corpse", "bleeding" — they trip image-gen safety filters downstream.
- 250-400 words total.

Return ONLY the descriptor paragraphs. No section labels, no preamble, no markdown.`

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
        // Generous budget so the model has room for the full 250-400 word
        // structured descriptor (Claude Sonnet typically uses ~600 output
        // tokens for this kind of detailed analysis).
        max_tokens: 8000,
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
  const message = data?.choices?.[0]?.message
  const finishReason = data?.choices?.[0]?.finish_reason

  // OpenRouter / OpenAI return content as either a string or an array of
  // typed parts (text + tool_calls etc.). Handle both shapes.
  let descriptor: string | null = null
  if (typeof message?.content === 'string') {
    descriptor = message.content
  } else if (Array.isArray(message?.content)) {
    descriptor = message.content
      .filter((p: { type?: string; text?: string }) => p?.type === 'text' && typeof p.text === 'string')
      .map((p: { text: string }) => p.text)
      .join('\n')
  }

  if (!descriptor || !descriptor.trim()) {
    // Surface the actual reason so users can react (content filter, token
    // exhaustion, model refusal, etc.) instead of a generic "no content".
    const refusal = (message as { refusal?: string } | undefined)?.refusal
    let diag = `Vision model "${model}" returned no usable text`
    if (refusal) diag += ` (refusal: ${String(refusal).slice(0, 200)})`
    else if (finishReason === 'content_filter') diag += ' (response filtered by safety policy)'
    else if (finishReason === 'length') diag += ' (token budget exhausted before output — try a different model)'
    else if (finishReason) diag += ` (finish_reason: ${finishReason})`
    return NextResponse.json({ error: diag }, { status: 502 })
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
