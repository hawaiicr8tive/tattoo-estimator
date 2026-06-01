import type { Viewport } from 'next'

// Lock the WebView: no pinch-zoom, no rubber-band, draw under the status bar.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#000000',
}

export default function KioskLayout({ children }: { children: React.ReactNode }) {
  return children
}
