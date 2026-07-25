import ControlsPage from '@/components/admin/ControlsPage'
import { requirePage } from '@/lib/dal'

export const dynamic = 'force-dynamic'

export default async function Controls() {
  const user = await requirePage('page:controls')
  return (
    <div className="px-3 sm:px-4 py-6 sm:py-8 max-w-7xl mx-auto">
      <ControlsPage canManageUsers={user?.permissions.has('users:manage') ?? false} />
    </div>
  )
}
