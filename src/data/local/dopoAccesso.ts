// La pagina aperta da chi non era ancora dentro: dopo l'accesso si torna lì, una volta sola.
// Sta nella memoria di sessione così regge alla ricarica durante la conferma dell'email.
const KEY = 'groomly.dopoAccesso'

/** Solo percorsi interni all'app; login e inviti hanno già la loro strada. */
export function destinazioneValida(percorso: string): boolean {
  if (!percorso.startsWith('/') || percorso.startsWith('//')) return false
  if (percorso === '/' || percorso.startsWith('/?')) return false
  return !percorso.startsWith('/login') && !percorso.startsWith('/invito/')
}

// Chi è già stato dentro in questa apertura ed esce (Esci, sessione scaduta) non lascia la sua pagina a chi entra dopo.
let entratoInQuestaApertura = false

export function segnaEntrato(): void {
  entratoInQuestaApertura = true
}

/** Solo per i test. */
export function __resetDopoAccesso(): void {
  entratoInQuestaApertura = false
}

export function ricordaDestinazione(percorso: string): void {
  if (entratoInQuestaApertura || !destinazioneValida(percorso)) return
  try {
    sessionStorage.setItem(KEY, percorso)
  } catch {
    // Senza memoria di sessione dopo l'accesso si va in Home, come prima.
  }
}

/** La destinazione senza toglierla: la legge il disegno, la toglie poi `dimenticaDestinazione`. */
export function destinazioneRicordata(): string {
  try {
    const percorso = sessionStorage.getItem(KEY)
    return percorso && destinazioneValida(percorso) ? percorso : '/'
  } catch {
    return '/'
  }
}

export function dimenticaDestinazione(): void {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // niente da dimenticare
  }
}
