import ImageLibrary from '@/components/library/ImageLibrary'

export const dynamic = 'force-dynamic'

export default function LibraryPage() {
  return (
    <div className="px-3 sm:px-4 py-6 sm:py-8 max-w-7xl mx-auto">
      <ImageLibrary />
    </div>
  )
}
