import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import type { StyleOption } from '@/lib/types'

const DEFAULTS: StyleOption[] = [
  { id: 'fine-line',   label: 'Fine Line / Dotwork',           description: 'Delicate lines, intricate detail, minimal shading',     multiplier: 1.00 },
  { id: 'traditional', label: 'Traditional / Neo-Traditional',  description: 'Bold outlines, classic imagery, rich color fills',      multiplier: 1.00 },
  { id: 'realism',     label: 'Realism & Portraits',            description: 'Photo-realistic detail, portraits, nature scenes',      multiplier: 1.30 },
  { id: 'polynesian',  label: 'Polynesian / Tribal',            description: 'Dense patterns, cultural motifs, high ink coverage',    multiplier: 1.15 },
  { id: 'geometric',   label: 'Geometric',                      description: 'Precise shapes, sacred geometry, ruler-straight lines', multiplier: 1.10 },
]

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function GET() {
  try {
    const db = getServiceClient()
    const { data, error } = await db
      .from('admin_config')
      .select('data')
      .eq('key', 'styles')
      .single()

    if (error || !data?.data) return NextResponse.json(DEFAULTS, { headers: CORS })
    return NextResponse.json(data.data, { headers: CORS })
  } catch {
    return NextResponse.json(DEFAULTS, { headers: CORS })
  }
}
