import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import './globals.css'
import LoginForm from '@/components/LoginForm'
import TabNav from '@/components/TabNav'
import { ADMIN_COOKIE, verifyAdminToken } from '@/lib/admin-auth'

export const metadata: Metadata = {
  title: 'Style Prediction Model',
  description: 'Trend cycle dashboard, fusion lab, and AI research for style intelligence.',
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_COOKIE)?.value
  const authed = verifyAdminToken(token)

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[var(--brand-bg)]">
        {authed ? (
          <>
            <TabNav />
            <main className="flex-1">{children}</main>
          </>
        ) : (
          <LoginForm />
        )}
      </body>
    </html>
  )
}
