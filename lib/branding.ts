export interface BrandingConfig {
  primary: string       // accent — borders, badges, progress bar, booking CTA panel
  primaryText: string   // text on accent-colored backgrounds
  button: string        // main CTA action buttons (Next, Show My Estimate, Book with X)
  buttonOpacity: number // 0–100 — action button background opacity
  buttonText: string    // text on action buttons
  cardDefaultBg: string  // unselected style/size/color card background
  cardDefaultOpacity: number // 0–100
  cardDefaultText: string // unselected card label text
  cardSelectedBg: string // selected style/size/color card fill
  cardSelectedOpacity: number // 0–100
  cardSelectedText: string // selected card label text
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
  button:        '#7B0000',
  buttonOpacity: 100,
  buttonText:    '#ffffff',
  cardDefaultBg:       '#ffffff',
  cardDefaultOpacity:  100,
  cardDefaultText:     '#0A0A0A',
  cardSelectedBg:      '#7B0000',
  cardSelectedOpacity: 5,
  cardSelectedText:    '#0A0A0A',
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
