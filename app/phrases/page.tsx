import ChaosPhraseLibrary from '@/components/admin/ChaosPhraseLibrary'
import { requirePage } from '@/lib/dal'

export const dynamic = 'force-dynamic'

export default async function PhrasesPage() {
  await requirePage('page:phrases')
  return (
    <div className="px-3 sm:px-4 py-6 sm:py-8 max-w-7xl mx-auto">
      <ChaosPhraseLibrary />
    </div>
  )
}
