import crypto from 'crypto'
import { promisify } from 'util'
import { getServiceClient } from '@/lib/supabase'
import { isPermission, isRole, type Permission, type Role } from '@/lib/permissions'

const KEY = 'users'
const scrypt = promisify(crypto.scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>

const SCRYPT_KEYLEN = 32

/** A user record as stored in `admin_config['users']`. */
export interface AppUser {
  id: string
  email: string
  name: string
  role: Role
  grant: Permission[]
  revoke: Permission[]
  /** `scrypt$<saltHex>$<hashHex>`. Absent for a user who hasn't set one yet. */
  passwordHash?: string
  disabled: boolean
  createdAt: string
  updatedAt: string
}

/** User data safe to send to the browser — never includes `passwordHash`. */
export type PublicUser = Omit<AppUser, 'passwordHash'> & { hasPassword: boolean }

export function toPublicUser(user: AppUser): PublicUser {
  const { passwordHash, ...rest } = user
  return { ...rest, hasPassword: Boolean(passwordHash) }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

// ---------------------------------------------------------------------------
// Password hashing
// ---------------------------------------------------------------------------

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16)
  const hash = await scrypt(password, salt, SCRYPT_KEYLEN)
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`
}

export async function verifyPassword(password: string, stored: string | undefined): Promise<boolean> {
  if (!stored) return false
  const [scheme, saltHex, hashHex] = stored.split('$')
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false
  let expected: Buffer
  try {
    expected = Buffer.from(hashHex, 'hex')
  } catch {
    return false
  }
  const actual = await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length)
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected)
}

/**
 * Short fingerprint of a stored password hash, embedded in the session cookie.
 * Comparing it on each request means changing or clearing someone's password
 * immediately invalidates their existing sessions.
 *
 * Pass the salted scrypt *hash*, never a raw password: the cookie payload is
 * signed but not encrypted, so a fingerprint of a raw password would give
 * anyone holding a stolen cookie something to brute-force offline.
 */
export function passwordStamp(user: Pick<AppUser, 'passwordHash'>): string {
  return crypto
    .createHash('sha256')
    .update(user.passwordHash ?? 'no-password')
    .digest('hex')
    .slice(0, 16)
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

function coerceUser(raw: unknown): AppUser | null {
  if (!raw || typeof raw !== 'object') return null
  const x = raw as Record<string, unknown>
  if (typeof x.id !== 'string' || typeof x.email !== 'string') return null
  const now = new Date().toISOString()
  return {
    id: x.id,
    email: normalizeEmail(x.email),
    name: typeof x.name === 'string' ? x.name : '',
    role: isRole(x.role) ? x.role : 'guest',
    grant: Array.isArray(x.grant) ? x.grant.filter(isPermission) : [],
    revoke: Array.isArray(x.revoke) ? x.revoke.filter(isPermission) : [],
    passwordHash: typeof x.passwordHash === 'string' ? x.passwordHash : undefined,
    disabled: x.disabled === true,
    createdAt: typeof x.createdAt === 'string' ? x.createdAt : now,
    updatedAt: typeof x.updatedAt === 'string' ? x.updatedAt : now,
  }
}

/** All users, or `[]` when none have been created yet. */
export async function loadUsers(): Promise<AppUser[]> {
  try {
    const db = getServiceClient()
    const { data, error } = await db.from('admin_config').select('data').eq('key', KEY).single()
    if (error || !data?.data) return []
    const rows = (data.data as { users?: unknown }).users
    if (!Array.isArray(rows)) return []
    return rows.map(coerceUser).filter((u): u is AppUser => u !== null)
  } catch {
    // No table / no service key / offline — behave as "no users configured" so
    // the ADMIN_PASSWORD owner login still gets you in.
    return []
  }
}

async function saveUsers(users: AppUser[]): Promise<void> {
  const db = getServiceClient()
  const { error } = await db
    .from('admin_config')
    .upsert(
      { key: KEY, data: { users }, updated_at: new Date().toISOString() },
      { onConflict: 'key' },
    )
  if (error) throw error
}

export async function findUserById(id: string): Promise<AppUser | null> {
  return (await loadUsers()).find(u => u.id === id) ?? null
}

export async function findUserByEmail(email: string): Promise<AppUser | null> {
  const target = normalizeEmail(email)
  return (await loadUsers()).find(u => u.email === target) ?? null
}

export interface CreateUserInput {
  email: string
  name?: string
  role: Role
  password?: string
  grant?: Permission[]
  revoke?: Permission[]
}

export async function createUser(input: CreateUserInput): Promise<AppUser> {
  const email = normalizeEmail(input.email)
  if (!email || !email.includes('@')) throw new Error('A valid email address is required')

  const users = await loadUsers()
  if (users.some(u => u.email === email)) throw new Error(`${email} already has an account`)

  const now = new Date().toISOString()
  const user: AppUser = {
    id: crypto.randomUUID(),
    email,
    name: input.name?.trim() || email.split('@')[0],
    role: input.role,
    grant: (input.grant ?? []).filter(isPermission),
    revoke: (input.revoke ?? []).filter(isPermission),
    passwordHash: input.password ? await hashPassword(input.password) : undefined,
    disabled: false,
    createdAt: now,
    updatedAt: now,
  }
  await saveUsers([...users, user])
  return user
}

export interface UpdateUserInput {
  name?: string
  role?: Role
  password?: string
  grant?: Permission[]
  revoke?: Permission[]
  disabled?: boolean
}

export async function updateUser(id: string, patch: UpdateUserInput): Promise<AppUser> {
  const users = await loadUsers()
  const index = users.findIndex(u => u.id === id)
  if (index === -1) throw new Error('User not found')

  const current = users[index]
  const next: AppUser = {
    ...current,
    name: patch.name?.trim() || current.name,
    role: patch.role ?? current.role,
    grant: patch.grant ? patch.grant.filter(isPermission) : current.grant,
    revoke: patch.revoke ? patch.revoke.filter(isPermission) : current.revoke,
    disabled: patch.disabled ?? current.disabled,
    passwordHash: patch.password ? await hashPassword(patch.password) : current.passwordHash,
    updatedAt: new Date().toISOString(),
  }

  // Never let the last enabled admin lock everyone out of user management.
  if (isLastEnabledAdmin(users, current) && (next.role !== 'admin' || next.disabled)) {
    throw new Error('This is the only active admin — promote another admin first')
  }

  users[index] = next
  await saveUsers(users)
  return next
}

export async function deleteUser(id: string): Promise<void> {
  const users = await loadUsers()
  const target = users.find(u => u.id === id)
  if (!target) return
  if (isLastEnabledAdmin(users, target)) {
    throw new Error('This is the only active admin — promote another admin first')
  }
  await saveUsers(users.filter(u => u.id !== id))
}

function isLastEnabledAdmin(users: AppUser[], candidate: AppUser): boolean {
  if (candidate.role !== 'admin' || candidate.disabled) return false
  return users.filter(u => u.role === 'admin' && !u.disabled).length === 1
}
