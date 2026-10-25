declare global {
  interface Window {
    __GROOMLY_DISTRIBUTION__?: string
  }
}

/** La variante play non scarica APK e non mostra l’avviso. GitHub e il browser restano com’erano. */
export function aggiornamentiApkAttivi(): boolean {
  if (typeof window === 'undefined') return true
  return window.__GROOMLY_DISTRIBUTION__ !== 'play'
}

/** Pagine legali sul sito, con la lingua della persona. Vale per github e play. */
export function linkLegale(pagina: 'privacy' | 'termini' | 'dpa' | 'elimina-account', lingua: string): string {
  return `https://groomlyapp.it/${pagina}/?lang=${lingua}`
}
