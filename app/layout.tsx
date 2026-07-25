import type { Metadata, Viewport } from 'next'
import './globals.css'
import LoginForm from '@/components/LoginForm'
import TabNav from '@/components/TabNav'
import { getSession } from '@/lib/dal'

export const metadata: Metadata = {
  title: 'Style Prediction Model',
  description: 'Trend cycle dashboard, fusion lab, and AI research for style intelligence.',
}

/**
 * iPhone-friendly viewport — covers the safe area cutout, prevents the
 * page from zooming when the user taps an input, and lets the dark theme
 * tint the iOS status bar and Android browser chrome.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#08080d',
}

/**
 * Inline boot script — applies the saved accent to <html> before the page
 * paints, so changing accents doesn't flash the default on every reload.
 * Kept minimal; safe to inline because it only reads localStorage and
 * sets one attribute.
 */
const ACCENT_BOOTSTRAP = `
try {
  var a = localStorage.getItem('spm-accent');
  if (a && /^[a-z-]+$/.test(a)) document.documentElement.setAttribute('data-accent', a);
} catch (e) {}
`.trim()

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // The single authentication gate: with no session, page bodies are never
  // rendered at all, only the login form. Per-page *authorization* is enforced
  // separately by `requirePage` in each page.
  const user = await getSession()

  return (
    <html lang="en" className="h-full antialiased dark" data-accent="indigo" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: ACCENT_BOOTSTRAP }} />
      </head>
      <body className="min-h-full flex flex-col bg-[var(--brand-bg)] text-[var(--brand-text)]">
        {user ? (
          <>
            <TabNav
              permissions={[...user.permissions]}
              displayName={user.name || user.email}
            />
            <main className="flex-1">{children}</main>
          </>
        ) : (
          <LoginForm />
        )}
      </body>
    </html>
  )
}
