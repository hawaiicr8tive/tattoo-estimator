import ImageLibrary from '@/components/library/ImageLibrary'
import { requirePage } from '@/lib/dal'

export const dynamic = 'force-dynamic'

export default async function LibraryPage() {
  await requirePage('page:library')
  return (
    <div className="px-3 sm:px-4 py-6 sm:py-8 max-w-7xl mx-auto">
      <ImageLibrary />
    </div>
  )
}
