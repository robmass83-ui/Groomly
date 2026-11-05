import { frase } from '../i18n/frase'
export type SystemBackChoice = 'dismiss' | 'account' | 'dog' | 'listino' | 'impostazioni' | 'incassi' | 'paginaAltro' | 'magazzino' | 'home' | 'history' | 'exit'

const LISTINO_SHEET_PATHS = ['/listino/prezzi', '/listino/gestione', '/listino/stampa']

export function isDogScreen(pathname: string): boolean {
  return pathname === '/animali/nuovo' || /^\/animali\/[^/]+$/.test(pathname)
}

export function systemBackChoice(pathname: string, overlayOpen: boolean, canGoBack: boolean, search = ''): SystemBackChoice {
  if (overlayOpen) return 'dismiss'
  // Info personali, Sicurezza e Privacy tornano alla home dell'account, da qualunque punto siano state aperte.
  if (pathname === '/impostazioni/account' && new URLSearchParams(search).get('scheda')) return 'account'
  if (LISTINO_SHEET_PATHS.includes(pathname)) return 'listino'
  if (isDogScreen(pathname)) return 'dog'
  if (canGoBack) return 'history'
  // Non è una scheda della barra: aperta da un link, si torna alla Home.
  if (pathname === '/impostazioni') return 'home'
  if (pathname === '/impostazioni/legale' || pathname === '/impostazioni/info') return 'account'
  if (pathname.startsWith('/impostazioni/')) return 'impostazioni'
  if (pathname.startsWith('/incassi/')) return 'incassi'
  if (pathname.startsWith('/altro/magazzino/')) return 'magazzino'
  if (pathname.startsWith('/altro/')) return 'paginaAltro'
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
  const close = dialog.querySelector(`button[aria-label="${frase('chiudi')}"]`)
  if (close instanceof HTMLButtonElement) {
    close.click()
    return true
  }
  return false
}
