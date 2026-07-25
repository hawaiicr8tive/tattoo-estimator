import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { resolvePermissions, type Permission, type Role } from '@/lib/permissions'
import {
  findUserById,
  loadUsers,
  passwordStamp,
  verifyPassword,
  type AppUser,
} from '@/lib/users-store'

export const ADMIN_COOKIE = 'admin_session'
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 // 24 hours

/**
 * Synthetic id for the built-in `ADMIN_PASSWORD` account. It is deliberately
 * not stored in `admin_config['users']`, which is what makes it un-deletable:
 * even if every stored user is removed or disabled, whoever holds
 * ADMIN_PASSWORD can still sign in and repair the user list.
 */
export const OWNER_ID = '__owner__'

/** The resolved caller — a stored user, or the built-in ADMIN_PASSWORD owner. */
export interface SessionUser {
  id: string
  email: string
  name: string
  role: Role
  permissions: Set<Permission>
  isOwner: boolean
}

function sessionSecret(): string | null {
  return process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || null
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

function ownerUser(): SessionUser {
  return {
    id: OWNER_ID,
    email: 'owner',
    name: 'Owner',
    role: 'admin',
    permissions: resolvePermissions({ role: 'admin' }),
    isOwner: true,
  }
}

function toSessionUser(user: AppUser): SessionUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    permissions: resolvePermissions(user),
    isOwner: false,
  }
}

// ---------------------------------------------------------------------------
// Cookie format: base64url(JSON payload) + "." + HMAC-SHA256 hex
// ---------------------------------------------------------------------------

export interface SessionPayload {
  /** User id, or {@link OWNER_ID}. */
  uid: string
  /** Password fingerprint — rotating a password invalidates old cookies. */
  st: string
}

function sign(body: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(body).digest('hex')
}

function encodeSession(payload: SessionPayload, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  return `${body}.${sign(body, secret)}`
}

function decodeSession(token: string, secret: string): SessionPayload | null {
  const dot = token.lastIndexOf('.')
  if (dot < 1) return null
  const body = token.slice(0, dot)
  const signature = token.slice(dot + 1)
  if (!safeEqual(signature, sign(body, secret))) return null
  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as unknown
    if (!parsed || typeof parsed !== 'object') return null
    const { uid, st } = parsed as Record<string, unknown>
    if (typeof uid !== 'string' || typeof st !== 'string') return null
    return { uid, st }
  } catch {
    return null
  }
}

/**
 * Pre-multi-user cookies stored `HMAC(ADMIN_PASSWORD, 'admin-session')` with no
 * payload. Still honoured as an owner session so a signed-in session survives
 * the upgrade instead of bouncing the user back to the login screen.
 */
function isLegacyOwnerToken(token: string): boolean {
  const password = process.env.ADMIN_PASSWORD
  if (!password || token.includes('.')) return false
  const expected = crypto.createHmac('sha256', password).update('admin-session').digest('hex')
  return token.length === expected.length && safeEqual(token, expected)
}

export function setSessionCookie(res: NextResponse, session: SessionPayload): void {
  const secret = sessionSecret()
  if (!secret) throw new Error('ADMIN_PASSWORD or SESSION_SECRET must be configured')
  res.cookies.set(ADMIN_COOKIE, encodeSession(session, secret), {
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
 * Constant stamp for the owner. Deliberately *not* derived from
 * `ADMIN_PASSWORD`: the payload is signed but not encrypted, so anything
 * password-derived in it would hand an attacker with a stolen cookie an offline
 * brute-force target for the password itself.
 *
 * Nothing is lost by making it constant. When `SESSION_SECRET` is unset the
 * signing secret *is* `ADMIN_PASSWORD`, so rotating the password already
 * invalidates every owner cookie via the signature. When `SESSION_SECRET` is
 * set, surviving a password rotation is the documented reason to set it.
 */
const OWNER_STAMP = 'owner'

export function ownerSessionPayload(): SessionPayload {
  return { uid: OWNER_ID, st: OWNER_STAMP }
}

export function userSessionPayload(user: AppUser): SessionPayload {
  return { uid: user.id, st: passwordStamp(user) }
}

// ---------------------------------------------------------------------------
// Resolving a session
// ---------------------------------------------------------------------------

/**
 * Resolves a cookie value to the signed-in user, or null. The stored user is
 * re-read on every call, so disabling a user or changing their role takes
 * effect on their next request rather than whenever their cookie expires.
 */
export async function resolveSession(token: string | undefined | null): Promise<SessionUser | null> {
  const secret = sessionSecret()
  if (!secret || !token) return null

  if (isLegacyOwnerToken(token)) return ownerUser()

  const payload = decodeSession(token, secret)
  if (!payload) return null

  if (payload.uid === OWNER_ID) {
    return safeEqual(payload.st, OWNER_STAMP) ? ownerUser() : null
  }

  const user = await findUserById(payload.uid)
  if (!user || user.disabled) return null
  if (!safeEqual(payload.st, passwordStamp(user))) return null
  return toSessionUser(user)
}

/**
 * Verifies an email + password pair. Omitting the email authenticates the
 * built-in ADMIN_PASSWORD owner, which is how login worked before multi-user.
 */
export async function authenticate(
  email: string | undefined,
  password: string,
): Promise<{ session: SessionPayload; user: SessionUser } | null> {
  const adminPassword = process.env.ADMIN_PASSWORD
  const ownerMatches = Boolean(adminPassword) && safeEqual(password, adminPassword!)

  if (email) {
    const target = email.trim().toLowerCase()
    const users = await loadUsers()
    const user = users.find(u => u.email === target)
    if (user && !user.disabled && (await verifyPassword(password, user.passwordHash))) {
      return { session: userSessionPayload(user), user: toSessionUser(user) }
    }
  }

  // Owner falls through for any email (or none), so a fresh install with no
  // stored users yet isn't a chicken-and-egg problem.
  if (ownerMatches) return { session: ownerSessionPayload(), user: ownerUser() }
  return null
}

// ---------------------------------------------------------------------------
// Route handler guards
// ---------------------------------------------------------------------------

function unconfigured(): NextResponse {
  return NextResponse.json({ error: 'ADMIN_PASSWORD not configured' }, { status: 500 })
}

export async function getSessionFromRequest(req: NextRequest): Promise<SessionUser | null> {
  return resolveSession(req.cookies.get(ADMIN_COOKIE)?.value)
}

/** Guard result — check `'error' in result`; `result.error` is a NextResponse. */
export type Guard = { user: SessionUser } | { error: NextResponse }

/** Requires any valid session. */
export async function requireAuth(req: NextRequest): Promise<Guard> {
  if (!sessionSecret()) return { error: unconfigured() }
  const user = await getSessionFromRequest(req)
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  return { user }
}

/** As {@link requireAuth}, and additionally requires `permission`. */
export async function requirePermission(req: NextRequest, permission: Permission): Promise<Guard> {
  const result = await requireAuth(req)
  if ('error' in result) return result
  if (!result.user.permissions.has(permission)) {
    return {
      error: NextResponse.json(
        { error: 'You do not have permission to do that', permission },
        { status: 403 },
      ),
    }
  }
  return result
}
