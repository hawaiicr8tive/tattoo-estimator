import UsersTab from '@/components/admin/UsersTab'
import { requirePage } from '@/lib/dal'

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  await requirePage('users:manage')
  return (
    <div className="px-3 sm:px-4 py-6 sm:py-8 max-w-7xl mx-auto space-y-5">
      <header>
        <h1 className="text-xl sm:text-2xl font-black text-[var(--brand-text)]">Users</h1>
        <p className="text-xs text-[var(--brand-text-mid)] mt-1">
          Who can sign in, and which pages and actions each person can reach.
        </p>
      </header>
      <UsersTab />
    </div>
  )
}
