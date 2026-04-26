import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export const ADMIN_COOKIE = 'admin_session'
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 // 24 hours

/**
 * Deterministic per-password session token. Storing this (not the password)
 * in the cookie means a leaked cookie does not leak the password, and the
 * server can validate without any session storage.
 */
function expectedToken(password: string): string {
  return crypto.createHmac('sha256', password).update('admin-session').digest('hex')
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

export function setSessionCookie(res: NextResponse, password: string): void {
  res.cookies.set(ADMIN_COOKIE, expectedToken(password), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: COOKIE_MAX_AGE_SECONDS,
  })
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(ADMIN_COOKIE, '', { path: '/', maxAge: 0 })
}

/**
 * Returns true if the supplied cookie value matches the expected admin session
 * token. Use from server components / route handlers that already have the
 * cookie value (e.g. via `cookies()` from `next/headers`).
 */
export function verifyAdminToken(token: string | undefined | null): boolean {
  const password = process.env.ADMIN_PASSWORD
  if (!password || !token) return false
  const expected = expectedToken(password)
  if (token.length !== expected.length) return false
  return safeEqual(token, expected)
}

/**
 * Returns null if the request carries a valid admin session cookie; otherwise
 * returns a NextResponse the caller should return immediately.
 */
export function requireAdmin(req: NextRequest): NextResponse | null {
  const password = process.env.ADMIN_PASSWORD
  if (!password) {
    return NextResponse.json({ error: 'ADMIN_PASSWORD not configured' }, { status: 500 })
  }
  const cookie = req.cookies.get(ADMIN_COOKIE)?.value
  if (!cookie || !safeEqual(cookie, expectedToken(password))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}
