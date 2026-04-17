import { NextRequest, NextResponse } from 'next/server'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}
import { getServiceClient } from '@/lib/supabase'
import { calculateEstimateAllTiers } from '@/lib/pricing'
import { matchArtists } from '@/lib/artist-matching'
import type { PlacementKey, TattooSize, StyleOption } from '@/lib/types'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { style, placement, size, isColor, notes, firstName, email, optedIn } = body as {
      style: string
      placement: PlacementKey
      size: TattooSize
      isColor: boolean
      notes?: string
      firstName: string
      email: string
      optedIn: boolean
    }

    if (!style || !placement || !size || isColor === undefined || !firstName || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400, headers: CORS })
    }

    const input = { style, placement, size, isColor, notes }

    // Fetch custom style multipliers from Supabase (falls back to built-ins if not found)
    let extraStyleMultipliers: Record<string, number> | undefined
    try {
      const db = getServiceClient()
      const { data } = await db.from('admin_config').select('data').eq('key', 'styles').single()
      if (data?.data) {
        extraStyleMultipliers = Object.fromEntries(
          (data.data as StyleOption[]).map(s => [s.id, s.multiplier])
        )
      }
    } catch { /* use built-in multipliers */ }

    const estimate = calculateEstimateAllTiers(input, extraStyleMultipliers)
    const artists = matchArtists(input)

    const db = getServiceClient()

    const { data, error } = await db
      .from('leads')
      .insert({
        first_name: firstName,
        email,
        style,
        placement,
        size,
        is_color: isColor,
        notes: notes ?? null,
        price_min: estimate.priceRange.min,
        price_max: estimate.priceRange.max,
        hours_min: estimate.timeRange.min,
        hours_max: estimate.timeRange.max,
        matched_artists: artists.map(a => a.id),
        opted_in: optedIn,
        source: 'estimator-v1',
      })
      .select('id')
      .single()

    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json({ error: 'Failed to save estimate' }, { status: 500, headers: CORS })
    }

    // Send email notification to studio
    const studioEmail = process.env.STUDIO_EMAIL ?? 'sean_m@tattoolicious.com'
    await resend.emails.send({
      from: 'Tattoolicious Estimator <noreply@tattoolicious.com>',
      to: studioEmail,
      subject: `New estimate: ${firstName} (${style}, ${size})`,
      html: `
        <h2>New Estimate Submitted</h2>
        <p><strong>Name:</strong> ${firstName}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Style:</strong> ${style}</p>
        <p><strong>Placement:</strong> ${placement}</p>
        <p><strong>Size:</strong> ${size}</p>
        <p><strong>Color:</strong> ${isColor ? 'Yes' : 'No'}</p>
        <p><strong>Notes:</strong> ${notes || 'None'}</p>
        <p><strong>Estimate:</strong> $${estimate.priceRange.min}–$${estimate.priceRange.max}</p>
        <p><strong>Opted in:</strong> ${optedIn ? 'Yes' : 'No'}</p>
      `,
    }).catch(e => console.warn('Studio email failed:', e))

    // Send confirmation to lead
    await resend.emails.send({
      from: 'Tattoolicious <noreply@tattoolicious.com>',
      to: email,
      subject: `${firstName}, here's your Tattoolicious estimate`,
      html: `
        <h2>Hi ${firstName}!</h2>
        <p>Thanks for using the Tattoolicious Price Estimator. Here's a summary:</p>
        <ul>
          <li><strong>Style:</strong> ${style}</li>
          <li><strong>Placement:</strong> ${placement}</li>
          <li><strong>Size:</strong> ${size}</li>
          <li><strong>Estimated price:</strong> $${estimate.priceRange.min}–$${estimate.priceRange.max}</li>
          <li><strong>Estimated time:</strong> ${estimate.timeRange.min}–${estimate.timeRange.max} hours</li>
        </ul>
        <p>${estimate.disclaimer}</p>
        <p><a href="https://tattoolicious.com/booking">Book a free consultation →</a></p>
      `,
    }).catch(e => console.warn('Lead email failed:', e))

    return NextResponse.json({ id: data.id }, { headers: CORS })
  } catch (e) {
    console.error('submit-lead error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: CORS })
  }
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const db = getServiceClient()
  const { data, error } = await db
    .from('leads')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404, headers: CORS })
  }

  return NextResponse.json(data, { headers: CORS })
}
