export const TYPE = {
  base: 12.5,
  pageTitle: 17,
  pageTitleTracking: '-0.015em',
  dogName: 18,
  rowTitle: 12.5,
  rowSub: 11,
  meta: 10.5,
  section: 11,
  sectionTracking: '0.04em',
  chip: 10.5,
  navLabel: 9.5,
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
