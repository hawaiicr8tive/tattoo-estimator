import { NextRequest, NextResponse } from 'next/server'
import { loadAllDatasets, loadIndustryDataset } from '@/lib/trends/store'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function GET(req: NextRequest) {
  const industry = req.nextUrl.searchParams.get('industry')
  if (industry) {
    const dataset = await loadIndustryDataset(industry)
    return NextResponse.json(dataset, { headers: CORS })
  }
  const datasets = await loadAllDatasets()
  return NextResponse.json({ datasets }, { headers: CORS })
}
