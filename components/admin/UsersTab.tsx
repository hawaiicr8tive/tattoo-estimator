'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  PERMISSION_META,
  PERMISSIONS,
  ROLE_DEFAULTS,
  ROLE_META,
  ROLES,
  resolvePermissions,
  type Permission,
  type Role,
} from '@/lib/permissions'

interface PublicUser {
  id: string
  email: string
  name: string
  role: Role
  grant: Permission[]
  revoke: Permission[]
  disabled: boolean
  hasPassword: boolean
  createdAt: string
  updatedAt: string
}

/** Permissions grouped for display, preserving the catalog order. */
const GROUPS = (() => {
  const groups: { name: string; permissions: Permission[] }[] = []
  for (const permission of PERMISSIONS) {
    const name = PERMISSION_META[permission].group
    const existing = groups.find(g => g.name === name)
    if (existing) existing.permissions.push(permission)
    else groups.push({ name, permissions: [permission] })
  }
  return groups
})()

export default function UsersTab() {
  const [users, setUsers] = useState<PublicUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // New-user form.
  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState<Role>('member')
  const [newPassword, setNewPassword] = useState('')
  const [creating, setCreating] = useState(false)

  /**
   * Every state update here happens after an await, so the mount effect below
   * never sets state synchronously during render. `loading` starts true, which
   * covers the initial fetch without a setState on the way in.
   */
  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to load users')
      setUsers(Array.isArray(data.users) ? data.users : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch on mount. The state updates live inside promise callbacks rather than
  // the effect body, and `cancelled` drops a response that lands after unmount.
  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/users')
      .then(async res => ({ ok: res.ok, body: await res.json() }))
      .then(({ ok, body }) => {
        if (cancelled) return
        if (!ok) throw new Error(body?.error ?? 'Failed to load users')
        setUsers(Array.isArray(body.users) ? body.users : [])
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load users')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  async function send(
    method: 'POST' | 'PATCH',
    body: Record<string, unknown>,
    successMessage: string,
  ): Promise<boolean> {
    setError(null)
    setNotice(null)
    try {
      const res = await fetch('/api/admin/users', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Request failed')
      setNotice(successMessage)
      await load()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
      return false
    }
  }

  async function handleCreate() {
    if (!newEmail.trim()) { setError('Email is required'); return }
    setCreating(true)
    const ok = await send('POST', {
      email: newEmail,
      name: newName,
      role: newRole,
      password: newPassword || undefined,
    }, `Added ${newEmail.trim().toLowerCase()}`)
    setCreating(false)
    if (ok) {
      setNewEmail('')
      setNewName('')
      setNewPassword('')
      setNewRole('member')
    }
  }

  async function patch(user: PublicUser, body: Record<string, unknown>, message: string) {
    setBusyId(user.id)
    await send('PATCH', { id: user.id, ...body }, message)
    setBusyId(null)
  }

  async function handleDelete(user: PublicUser) {
    if (!window.confirm(`Remove ${user.email}? They'll lose access immediately.`)) return
    setBusyId(user.id)
    setError(null)
    setNotice(null)
    try {
      const res = await fetch(`/api/admin/users?id=${encodeURIComponent(user.id)}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Delete failed')
      setNotice(`Removed ${user.email}`)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setBusyId(null)
    }
  }

  /**
   * Switches a single permission on or off for one user.
   *
   * An override is only stored when it differs from what the role already says,
   * so switching a permission back to its role value clears the override rather
   * than pinning it. That keeps the checkbox a plain on/off — no third state to
   * click through — while still letting a role change move anything the admin
   * hasn't explicitly decided.
   */
  function setPermission(user: PublicUser, permission: Permission, on: boolean) {
    const fromRole = ROLE_DEFAULTS[user.role].includes(permission)
    const grant = user.grant.filter(p => p !== permission)
    const revoke = user.revoke.filter(p => p !== permission)

    if (on && !fromRole) grant.push(permission)
    if (!on && fromRole) revoke.push(permission)

    const label = PERMISSION_META[permission].label
    void patch(user, { grant, revoke }, `${on ? 'Enabled' : 'Disabled'} ${label} for ${user.email}`)
  }

  /** Drops every override so the user follows their role again. */
  function resetToRole(user: PublicUser) {
    void patch(user, { grant: [], revoke: [] }, `${user.email} now follows the ${ROLE_META[user.role].label} role`)
  }

  const sorted = useMemo(
    () => [...users].sort((a, b) => a.email.localeCompare(b.email)),
    [users],
  )

  return (
    <div className="space-y-5">
      {error && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>
      )}
      {notice && (
        <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">{notice}</p>
      )}

      <section className="rounded-xl border border-[var(--brand-border)] bg-[var(--brand-card)] p-4 space-y-3">
        <h2 className="text-sm font-bold text-[var(--brand-text)]">Add a user</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
            placeholder="email@studio.com"
            type="email"
            className="rounded-lg border border-[var(--brand-border)] bg-[var(--brand-bg)] px-3 py-2 text-sm text-[var(--brand-text)]"
          />
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Display name (optional)"
            className="rounded-lg border border-[var(--brand-border)] bg-[var(--brand-bg)] px-3 py-2 text-sm text-[var(--brand-text)]"
          />
          <select
            value={newRole}
            onChange={e => setNewRole(e.target.value as Role)}
            className="rounded-lg border border-[var(--brand-border)] bg-[var(--brand-bg)] px-3 py-2 text-sm text-[var(--brand-text)] cursor-pointer"
          >
            {ROLES.map(role => (
              <option key={role} value={role}>{ROLE_META[role].label}</option>
            ))}
          </select>
          <input
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="Temporary password (min 8 chars)"
            type="password"
            className="rounded-lg border border-[var(--brand-border)] bg-[var(--brand-bg)] px-3 py-2 text-sm text-[var(--brand-text)]"
          />
        </div>
        <p className="text-[11px] text-[var(--brand-text-mid)]">{ROLE_META[newRole].description}</p>
        <button
          type="button"
          onClick={handleCreate}
          disabled={creating}
          className="rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60 cursor-pointer"
        >
          {creating ? 'Adding…' : 'Add user'}
        </button>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-[var(--brand-text)]">
          Users {loading ? '' : `(${sorted.length})`}
        </h2>

        {loading && <p className="text-xs text-[var(--brand-text-mid)]">Loading…</p>}
        {!loading && sorted.length === 0 && (
          <p className="text-xs text-[var(--brand-text-mid)]">
            No users yet. The built-in <code>ADMIN_PASSWORD</code> owner account always works —
            add teammates above to give them their own logins.
          </p>
        )}

        {sorted.map(user => {
          const effective = resolvePermissions(user)
          const busy = busyId === user.id
          const expanded = expandedId === user.id
          return (
            <div
              key={user.id}
              className={`rounded-xl border border-[var(--brand-border)] bg-[var(--brand-card)] p-4 space-y-3 ${user.disabled ? 'opacity-60' : ''}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[var(--brand-text)] truncate">
                    {user.name || user.email}
                    {user.disabled && <span className="ml-2 text-[10px] uppercase tracking-wide text-red-400">disabled</span>}
                    {!user.hasPassword && !user.disabled && (
                      <span className="ml-2 text-[10px] uppercase tracking-wide text-amber-400">no password set</span>
                    )}
                  </p>
                  <p className="text-xs text-[var(--brand-text-mid)] truncate">{user.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={user.role}
                    disabled={busy}
                    onChange={e => patch(user, { role: e.target.value as Role }, `Updated ${user.email}`)}
                    className="rounded-lg border border-[var(--brand-border)] bg-[var(--brand-bg)] px-2 py-1.5 text-xs text-[var(--brand-text)] cursor-pointer"
                  >
                    {ROLES.map(role => (
                      <option key={role} value={role}>{ROLE_META[role].label}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => patch(user, { disabled: !user.disabled }, `Updated ${user.email}`)}
                    className="rounded-lg border border-[var(--brand-border)] px-2 py-1.5 text-xs text-[var(--brand-text-mid)] hover:text-[var(--brand-text)] cursor-pointer disabled:opacity-60"
                  >
                    {user.disabled ? 'Enable' : 'Disable'}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleDelete(user)}
                    className="rounded-lg border border-red-500/40 px-2 py-1.5 text-xs text-red-400 hover:bg-red-500/10 cursor-pointer disabled:opacity-60"
                  >
                    Remove
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setExpandedId(expanded ? null : user.id)}
                className="text-xs font-semibold text-[var(--brand-primary)] cursor-pointer"
              >
                {expanded ? 'Hide permissions' : `Permissions (${effective.size} of ${PERMISSIONS.length})`}
              </button>

              {expanded && (
                <div className="space-y-3 pt-1">
                  {GROUPS.map(group => (
                    <div key={group.name} className="space-y-1.5">
                      <p className="text-[10px] uppercase tracking-wider text-[var(--brand-text-mid)]">{group.name}</p>
                      {group.permissions.map(permission => {
                        const on = effective.has(permission)
                        const overridden =
                          user.grant.includes(permission) || user.revoke.includes(permission)
                        return (
                          <label
                            key={permission}
                            className="flex items-start gap-2 cursor-pointer group"
                          >
                            <input
                              type="checkbox"
                              checked={on}
                              disabled={busy}
                              onChange={e => setPermission(user, permission, e.target.checked)}
                              className="mt-0.5 cursor-pointer"
                            />
                            <span className="min-w-0">
                              <span className="text-xs text-[var(--brand-text)]">
                                {PERMISSION_META[permission].label}
                                {overridden && (
                                  <span
                                    className="ml-1.5 text-[10px] text-[var(--brand-primary)]"
                                    title={`Set for this user, overriding the ${ROLE_META[user.role].label} role default`}
                                  >
                                    custom
                                  </span>
                                )}
                              </span>
                              <span className="block text-[11px] text-[var(--brand-text-mid)]">
                                {PERMISSION_META[permission].description}
                              </span>
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  ))}

                  {(user.grant.length > 0 || user.revoke.length > 0) && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => resetToRole(user)}
                      className="text-[11px] text-[var(--brand-text-mid)] hover:text-[var(--brand-text)] underline cursor-pointer disabled:opacity-60"
                    >
                      Reset to {ROLE_META[user.role].label} defaults
                    </button>
                  )}

                  <PasswordReset user={user} onSave={patch} busy={busy} />
                </div>
              )}
            </div>
          )
        })}
      </section>
    </div>
  )
}

function PasswordReset({
  user,
  onSave,
  busy,
}: {
  user: PublicUser
  onSave: (user: PublicUser, body: Record<string, unknown>, message: string) => Promise<void>
  busy: boolean
}) {
  const [value, setValue] = useState('')
  return (
    <div className="border-t border-[var(--brand-border)] pt-3 space-y-1.5">
      <p className="text-[10px] uppercase tracking-wider text-[var(--brand-text-mid)]">Password</p>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={e => setValue(e.target.value)}
          type="password"
          placeholder="Set a new password (min 8 chars)"
          className="flex-1 rounded-lg border border-[var(--brand-border)] bg-[var(--brand-bg)] px-3 py-2 text-xs text-[var(--brand-text)]"
        />
        <button
          type="button"
          disabled={busy || value.length < 8}
          onClick={async () => {
            await onSave(user, { password: value }, `Password updated for ${user.email}`)
            setValue('')
          }}
          className="rounded-lg border border-[var(--brand-border)] px-3 py-2 text-xs font-semibold text-[var(--brand-text)] cursor-pointer disabled:opacity-50"
        >
          Save
        </button>
      </div>
      <p className="text-[11px] text-[var(--brand-text-mid)]">
        Changing a password signs the user out of any existing sessions.
      </p>
    </div>
  )
}
