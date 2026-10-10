import type { ThemeChoice } from '../theme/theme'

export const DEVICE_THEME_KEY = 'groomly.theme'

export function readDeviceTheme(): ThemeChoice {
  const raw = localStorage.getItem(DEVICE_THEME_KEY)
  if (raw === 'light' || raw === 'dark' || raw === 'auto') return raw
  return 'auto'
}

export function writeDeviceTheme(theme: ThemeChoice): void {
  localStorage.setItem(DEVICE_THEME_KEY, theme)
}
