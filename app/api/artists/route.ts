import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import artistsData from '@/data/artists.json'
import type { Artist } from '@/lib/types'

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
      .eq('key', 'artists')
      .single()
    if (error || !data?.data) return NextResponse.json(artistsData, { headers: CORS })
    return NextResponse.json(data.data as Artist[], { headers: CORS })
  } catch {
    return NextResponse.json(artistsData, { headers: CORS })
  }
}
