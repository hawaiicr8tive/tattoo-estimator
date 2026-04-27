import { NextResponse } from 'next/server'
import { loadMotifLibrary } from '@/lib/trends/motif-store'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function GET() {
  const library = await loadMotifLibrary()
  return NextResponse.json(library, { headers: CORS })
}
