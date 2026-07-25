import { getSession } from '@/lib/dal'
import { firstAllowedPage } from '@/lib/permissions'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

/**
 * Terminal page for a signed-in user with no viewable pages. Deliberately
 * ungated so it can never take part in a redirect loop. If permissions were
 * granted since the redirect, bounce straight back into the app.
 */
export default async function NoAccessPage() {
  const user = await getSession()
  if (user) {
    const destination = firstAllowedPage(user.permissions)
    if (destination) redirect(destination)
  }

  return (
    <div className="px-3 sm:px-4 py-16 max-w-lg mx-auto text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--brand-primary)]/10 mb-4">
        <span className="text-[var(--brand-primary)] text-xl">🔒</span>
      </div>
      <h1 className="text-xl font-black text-[var(--brand-text)]">No access yet</h1>
      <p className="text-sm text-[var(--brand-text-mid)] mt-2">
        Your account doesn&apos;t have access to any pages yet. Ask an admin to grant you
        permissions from the Controls tab.
      </p>
    </div>
  )
}
