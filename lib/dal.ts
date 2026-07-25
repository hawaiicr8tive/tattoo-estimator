import 'server-only'

import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ADMIN_COOKIE, resolveSession, type SessionUser } from '@/lib/admin-auth'
import { firstAllowedPage, type Permission } from '@/lib/permissions'

/**
 * Data access layer for auth, per the Next.js authorization guidance: pages and
 * server components resolve the session here rather than trusting anything the
 * client sent. Memoized with React `cache` so several components in one render
 * pass share a single cookie read and user lookup.
 */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies()
  return resolveSession(store.get(ADMIN_COOKIE)?.value)
})

/**
 * Guards a page, returning the caller when they may view it.
 *
 * Authentication stays the root layout's job — it renders the login form
 * instead of `children` when there is no session, so an anonymous request never
 * reaches a page body and this returns null rather than redirecting (which at
 * `/` would just bounce the login screen to another URL).
 *
 * Authorization is enforced here: someone signed in without `permission` is
 * sent to the first page they *can* see. `firstAllowedPage` only ever returns
 * pages they hold, so that can never bounce back here. With no viewable page at
 * all they land on `/no-access`, which is itself ungated and so terminates the
 * redirect chain.
 */
export async function requirePage(permission: Permission): Promise<SessionUser | null> {
  const user = await getSession()
  if (!user) return null
  if (!user.permissions.has(permission)) {
    redirect(firstAllowedPage(user.permissions) ?? '/no-access')
  }
  return user
}
