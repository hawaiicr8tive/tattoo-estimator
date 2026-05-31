import { redirect } from 'next/navigation'

// /phrases moved into the unified /controls tab. Redirect any stale links.
export default function PhrasesPage() {
  redirect('/controls')
}
