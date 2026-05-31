import ChaosPhraseLibrary from '@/components/admin/ChaosPhraseLibrary'

export const dynamic = 'force-dynamic'

export default function PhrasesPage() {
  return (
    <div className="px-3 sm:px-4 py-6 sm:py-8 max-w-7xl mx-auto">
      <ChaosPhraseLibrary />
    </div>
  )
}
