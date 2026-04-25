import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import pricingConfig from '@/data/pricing-config.json'
import type { XlConfig } from '@/lib/types'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function GET() {
  const defaults = pricingConfig.xlConfig as XlConfig
  try {
    const db = getServiceClient()
    const { data, error } = await db
      .from('admin_config')
      .select('data')
      .eq('key', 'xlConfig')
      .single()
    if (error || !data?.data) return NextResponse.json(defaults, { headers: CORS })
    return NextResponse.json({ ...defaults, ...(data.data as Partial<XlConfig>) }, { headers: CORS })
  } catch {
    return NextResponse.json(defaults, { headers: CORS })
  }
}
