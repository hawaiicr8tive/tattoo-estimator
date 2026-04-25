export interface BrandingConfig {
  primary: string       // accent — borders, badges, progress bar, booking CTA panel
  primaryText: string   // text on accent-colored backgrounds
  button: string        // main CTA action buttons (Next, Show My Estimate, Book with X)
  buttonText: string    // text on action buttons
  pillDefaultBg: string // unselected placement pill background
  pillDefaultOpacity: number // 0–100 — unselected pill background opacity
  pillDefaultText: string // unselected placement pill text
  pillBg: string        // selected placement pill fill color
  pillOpacity: number   // 0–100 — selected pill fill opacity (0 = border only)
  pillText: string      // selected placement pill text color
  background: string    // page background
  cardBg: string        // card / panel background
  textDark: string      // headings & primary text
  textMid: string       // descriptions & secondary text
  border: string        // input and card borders
  bookingUrl: string    // CTA link on results page
}

export const BRANDING_DEFAULTS: BrandingConfig = {
  primary:     '#7B0000',
  primaryText: '#ffffff',
  button:      '#7B0000',
  buttonText:  '#ffffff',
  pillDefaultBg:      '#ffffff',
  pillDefaultOpacity: 100,
  pillDefaultText:    '#0A0A0A',
  pillBg:      '#7B0000',
  pillOpacity: 100,
  pillText:    '#ffffff',
  background:  '#F5F5F0',
  cardBg:      '#ffffff',
  textDark:    '#0A0A0A',
  textMid:     '#555555',
  border:      '#e5e7eb',
  bookingUrl:  'https://tattoolicious.com/booking',
}

export function hexToRgb(hex: string): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!m) return '0,0,0'
  return `${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)}`
}
