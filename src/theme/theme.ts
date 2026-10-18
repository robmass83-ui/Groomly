export const TYPE = {
  base: 14,
  pageTitle: 17,
  pageTitleTracking: '-0.015em',
  dogName: 18,
  rowTitle: 14,
  rowSub: 13,
  meta: 12,
  section: 12,
  sectionTracking: '0.04em',
  chip: 13,
  navLabel: 12,
} as const

export type ThemeChoice = 'light' | 'dark' | 'auto'

export function resolveTheme(choice: ThemeChoice, systemPrefersDark: boolean): 'light' | 'dark' {
  if (choice === 'auto') return systemPrefersDark ? 'dark' : 'light'
  return choice
}

export function prefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function applyTheme(resolved: 'light' | 'dark'): void {
  document.documentElement.dataset.theme = resolved
}

export function applyPlatform(native: boolean): void {
  document.documentElement.classList.toggle('native', native)
}
