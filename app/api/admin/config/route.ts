import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { readFileSync } from 'fs'
import { join } from 'path'

const STYLE_META: Record<string, { label: string; description: string }> = {
  'fine-line':   { label: 'Fine Line / Dotwork',            description: 'Delicate lines, intricate detail, minimal shading' },
  'traditional': { label: 'Traditional / Neo-Traditional',  description: 'Bold outlines, classic imagery, rich color fills' },
  'realism':     { label: 'Realism & Portraits',            description: 'Photo-realistic detail, portraits, nature scenes' },
  'polynesian':  { label: 'Polynesian / Tribal',            description: 'Dense patterns, cultural motifs, high ink coverage' },
  'geometric':   { label: 'Geometric',                      description: 'Precise shapes, sacred geometry, ruler-straight lines' },
}

const SIZE_META: Record<string, { label: string; dims: string; analog: string }> = {
  tiny:   { label: 'TINY',       dims: 'Under 2"', analog: 'Coin-sized' },
  small:  { label: 'SMALL',      dims: '2 – 4"',   analog: 'Palm-sized' },
  medium: { label: 'MEDIUM',     dims: '4 – 6"',   analog: 'Hand-sized' },
  large:  { label: 'LARGE',      dims: '6 – 9"',   analog: 'Forearm-length' },
  xl:     { label: 'XL / CUSTOM', dims: '9"+',      analog: 'Full sleeve / back piece' },
}

const PLACEMENT_LABELS: Record<string, string> = {
  'outer-arm': 'Outer Arm', 'thigh': 'Thigh', 'calf': 'Calf', 'shoulder': 'Shoulder', 'upper-back': 'Upper Back',
  'inner-arm': 'Inner Arm', 'forearm': 'Forearm', 'chest': 'Chest', 'stomach': 'Stomach', 'lower-back': 'Lower Back', 'shin': 'Shin',
  'ribs': 'Ribs', 'spine': 'Spine', 'neck': 'Neck', 'hands': 'Hands', 'feet': 'Feet', 'ankle': 'Ankle',
  'fingers': 'Fingers', 'behind-ear': 'Behind Ear', 'face': 'Face',
}

function buildDefaultConfig() {
  const pc = JSON.parse(readFileSync(join(process.cwd(), 'data/pricing-config.json'), 'utf8'))
  const artists = JSON.parse(readFileSync(join(process.cwd(), 'data/artists.json'), 'utf8'))

  return {
    pricing: {
      shopMinimum: pc.shopMinimum,
      tierRates: pc.tierRates,
      colorMultiplier: pc.colorMultiplier,
    },
    styles: Object.entries(pc.styleMultipliers as Record<string, number>).map(([id, multiplier]) => ({
      id,
      label: STYLE_META[id]?.label ?? id,
      description: STYLE_META[id]?.description ?? '',
      multiplier,
    })),
    sizes: Object.entries(pc.sizeHours as Record<string, [number, number]>).map(([id, [hoursMin, hoursMax]]) => ({
      id,
      label: SIZE_META[id]?.label ?? id,
      dims: SIZE_META[id]?.dims ?? '',
      analog: SIZE_META[id]?.analog ?? '',
      hoursMin,
      hoursMax,
      note: id === 'xl' ? 'Large pieces are quoted directly — your results will show a consultation range.' : '',
    })),
    placements: Object.entries(pc.placementMultipliers as Record<string, number>).map(([id, multiplier]) => {
      const group = Object.entries(pc.placementDifficulty as Record<string, string[]>)
        .find(([, ids]) => ids.includes(id))?.[0] ?? 'easy'
      return { id, label: PLACEMENT_LABELS[id] ?? id, group, multiplier }
    }),
    artists,
    xlConfig: pc.xlConfig,
  }
}

export async function GET() {
  try {
    const db = getServiceClient()
    const { data, error } = await db.from('admin_config').select('key, data')
    const defaults = buildDefaultConfig()

    if (error || !data?.length) return NextResponse.json(defaults)

    const saved = Object.fromEntries(data.map(r => [r.key, r.data]))
    return NextResponse.json({
      pricing:    saved.pricing    ?? defaults.pricing,
      styles:     saved.styles     ?? defaults.styles,
      sizes:      saved.sizes      ?? defaults.sizes,
      placements: saved.placements ?? defaults.placements,
      artists:    saved.artists    ?? defaults.artists,
      branding:   saved.branding   ?? {},
      xlConfig:   saved.xlConfig   ?? defaults.xlConfig,
    })
  } catch {
    return NextResponse.json(buildDefaultConfig())
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { key, data } = await req.json()
    if (!key || data === undefined) return NextResponse.json({ error: 'Missing key or data' }, { status: 400 })

    const db = getServiceClient()
    const { error } = await db.from('admin_config').upsert({ key, data, updated_at: new Date().toISOString() })
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('admin config save error:', e)
    return NextResponse.json({ error: 'Save failed' }, { status: 500 })
  }
}
