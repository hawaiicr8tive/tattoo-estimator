export interface BrandingConfig {
  primary: string       // accent, buttons, progress bar
  primaryText: string   // text on primary-colored backgrounds
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
