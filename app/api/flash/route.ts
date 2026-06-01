import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import flashData from '@/data/flash.json'
import type { FlashItem } from '@/lib/types'

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
      .eq('key', 'flash')
      .single()
    if (error || !data?.data) return NextResponse.json(flashData, { headers: CORS })
    return NextResponse.json(data.data as FlashItem[], { headers: CORS })
  } catch {
    return NextResponse.json(flashData, { headers: CORS })
  }
}
