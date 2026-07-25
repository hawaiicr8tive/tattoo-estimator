import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/admin-auth'
import { isPermission, isRole, type Permission } from '@/lib/permissions'
import {
  createUser,
  deleteUser,
  loadUsers,
  toPublicUser,
  updateUser,
} from '@/lib/users-store'

const MIN_PASSWORD_LENGTH = 8

function asRecord(body: unknown): Record<string, unknown> {
  return (body && typeof body === 'object' ? body : {}) as Record<string, unknown>
}

async function readBody(req: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    return asRecord(await req.json())
  } catch {
    return null
  }
}

function readPermissionList(value: unknown): Permission[] | undefined {
  if (!Array.isArray(value)) return undefined
  return value.filter(isPermission)
}

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

/** List all users. Never returns password hashes. */
export async function GET(req: NextRequest) {
  const guard = await requirePermission(req, 'users:manage')
  if ('error' in guard) return guard.error
  try {
    const users = await loadUsers()
    return NextResponse.json({ users: users.map(toPublicUser) })
  } catch (e) {
    console.error('load users error:', e)
    return fail(e instanceof Error ? e.message : 'Load failed', 500)
  }
}

/** Create a user. */
export async function POST(req: NextRequest) {
  const guard = await requirePermission(req, 'users:manage')
  if ('error' in guard) return guard.error

  const body = await readBody(req)
  if (!body) return fail('Invalid JSON')

  const email = typeof body.email === 'string' ? body.email : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const role = isRole(body.role) ? body.role : 'guest'

  if (password && password.length < MIN_PASSWORD_LENGTH) {
    return fail(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
  }

  try {
    const user = await createUser({
      email,
      name: typeof body.name === 'string' ? body.name : undefined,
      role,
      password: password || undefined,
      grant: readPermissionList(body.grant),
      revoke: readPermissionList(body.revoke),
    })
    return NextResponse.json({ user: toPublicUser(user) })
  } catch (e) {
    console.error('create user error:', e)
    return fail(e instanceof Error ? e.message : 'Create failed')
  }
}

/** Update a user's name, role, permission overrides, password, or disabled flag. */
export async function PATCH(req: NextRequest) {
  const guard = await requirePermission(req, 'users:manage')
  if ('error' in guard) return guard.error

  const body = await readBody(req)
  if (!body) return fail('Invalid JSON')

  const id = typeof body.id === 'string' ? body.id : ''
  if (!id) return fail('id is required')

  const password = typeof body.password === 'string' ? body.password : ''
  if (password && password.length < MIN_PASSWORD_LENGTH) {
    return fail(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
  }

  // Don't let an admin disable or demote their own account and lock themselves
  // out mid-session; the last-admin check in the store can't see who's asking.
  if (id === guard.user.id && (body.disabled === true || (isRole(body.role) && body.role !== 'admin'))) {
    return fail('You cannot remove your own access — ask another admin')
  }

  try {
    const user = await updateUser(id, {
      name: typeof body.name === 'string' ? body.name : undefined,
      role: isRole(body.role) ? body.role : undefined,
      password: password || undefined,
      grant: readPermissionList(body.grant),
      revoke: readPermissionList(body.revoke),
      disabled: typeof body.disabled === 'boolean' ? body.disabled : undefined,
    })
    return NextResponse.json({ user: toPublicUser(user) })
  } catch (e) {
    console.error('update user error:', e)
    return fail(e instanceof Error ? e.message : 'Update failed')
  }
}

/** Delete a user. */
export async function DELETE(req: NextRequest) {
  const guard = await requirePermission(req, 'users:manage')
  if ('error' in guard) return guard.error

  const id = req.nextUrl.searchParams.get('id') ?? ''
  if (!id) return fail('id is required')
  if (id === guard.user.id) return fail('You cannot delete your own account')

  try {
    await deleteUser(id)
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('delete user error:', e)
    return fail(e instanceof Error ? e.message : 'Delete failed')
  }
}
