import { NextRequest, NextResponse } from 'next/server'
import { clearSessionCookie, requireAdmin, setSessionCookie } from '@/lib/admin-auth'

export async function POST(req: NextRequest) {
  const { password } = await req.json()
  const correct = process.env.ADMIN_PASSWORD

  if (!correct) {
    return NextResponse.json({ error: 'ADMIN_PASSWORD not configured' }, { status: 500 })
  }
  if (password !== correct) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
  }

  const res = NextResponse.json({ success: true })
  setSessionCookie(res, correct)
  return res
}

/** Returns 200 if the caller already has a valid admin session. */
export async function GET(req: NextRequest) {
  const denied = requireAdmin(req)
  if (denied) return denied
  return NextResponse.json({ authed: true })
}

/** Logout. */
export async function DELETE() {
  const res = NextResponse.json({ success: true })
  clearSessionCookie(res)
  return res
}
