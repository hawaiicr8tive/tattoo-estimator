import { NextRequest, NextResponse } from 'next/server'
import {
  authenticate,
  clearSessionCookie,
  getSessionFromRequest,
  setSessionCookie,
} from '@/lib/admin-auth'

export async function POST(req: NextRequest) {
  if (!process.env.ADMIN_PASSWORD && !process.env.SESSION_SECRET) {
    return NextResponse.json({ error: 'ADMIN_PASSWORD not configured' }, { status: 500 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const x = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>
  const password = typeof x.password === 'string' ? x.password : ''
  const email = typeof x.email === 'string' && x.email.trim() ? x.email : undefined

  if (!password) {
    return NextResponse.json({ error: 'Password is required' }, { status: 400 })
  }

  const result = await authenticate(email, password)
  if (!result) {
    // Deliberately identical for unknown email, wrong password, and disabled
    // account, so responses can't be used to enumerate who has an account.
    return NextResponse.json({ error: 'Incorrect email or password' }, { status: 401 })
  }

  const res = NextResponse.json({ success: true, user: publicSession(result.user) })
  setSessionCookie(res, result.session)
  return res
}

/** Returns the current session, or 401 when there isn't a valid one. */
export async function GET(req: NextRequest) {
  const user = await getSessionFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ authed: true, user: publicSession(user) })
}

/** Logout. */
export async function DELETE() {
  const res = NextResponse.json({ success: true })
  clearSessionCookie(res)
  return res
}

function publicSession(user: Awaited<ReturnType<typeof getSessionFromRequest>>) {
  if (!user) return null
  return {
    email: user.email,
    name: user.name,
    role: user.role,
    permissions: [...user.permissions],
  }
}
