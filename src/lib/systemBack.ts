export type SystemBackChoice = 'dismiss' | 'dog' | 'history' | 'exit'

export function isDogScreen(pathname: string): boolean {
  return pathname === '/animali/nuovo' || /^\/animali\/[^/]+$/.test(pathname)
}

export function systemBackChoice(pathname: string, overlayOpen: boolean, canGoBack: boolean): SystemBackChoice {
  if (overlayOpen) return 'dismiss'
  if (isDogScreen(pathname)) return 'dog'
  if (canGoBack) return 'history'
  return 'exit'
}

export function overlayOpen(): boolean {
  return document.querySelector('[role="dialog"]') !== null
}

export function dismissTopOverlay(): boolean {
  const dialogs = document.querySelectorAll('[role="dialog"]')
  const dialog = dialogs.item(dialogs.length - 1)
  const overlay = dialog?.parentElement
  if (!overlay) return false
  for (const node of overlay.children) {
    if (node instanceof HTMLButtonElement) {
      node.click()
      return true
    }
  }
  const backdrop = overlay.querySelector('[data-testid="dialog-backdrop"], [data-testid="sheet-backdrop"]')
  if (backdrop instanceof HTMLElement) {
    backdrop.click()
    return true
  }
  const close = dialog.querySelector('button[aria-label="Chiudi"]')
  if (close instanceof HTMLButtonElement) {
    close.click()
    return true
  }
  return false
}
