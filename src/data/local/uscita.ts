import { discardPendingPhotos } from '../../lib/pendingPhoto'
import { firebaseEnabled } from '../firebase/enabled'
import { sharedMirrorKey } from '../../lib/sharedMirror'

// All'uscita si toglie dal telefono tutto ciò che è dell'account, anche senza il segno di copia del cloud:
// chi entra dopo non deve vedere i dati di chi è uscito. Restano l'accesso ricordato (solo email), la lingua,
// il telefono per le notifiche e le sue preferenze, il profilo di chi si registra e i segni
// (copia del cloud, copia condivisa fidata). In modalità locale i dati sono l'unica copia: non si tocca nulla.
export function pulisciDatiAccount(uid: string): void {
  if (!uid || !firebaseEnabled()) return
  try {
    const prefisso = `groomly.users.${uid}.`
    const tenere = sharedMirrorKey(uid)
    const chiavi: string[] = []
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)
      if (key && key.startsWith(prefisso) && key !== tenere) chiavi.push(key)
    }
    chiavi.push(`groomly.piano.${uid}`)
    for (const key of chiavi) localStorage.removeItem(key)
  } catch {
    // Se lo spazio locale non risponde si esce lo stesso: la ripartenza legge dal cloud.
  }
  discardPendingPhotos(uid)
}

let ripartenzaFinta: (() => void) | null = null

/** Solo per i test: sostituisce la ripartenza della pagina. */
export function __impostaRipartenza(riparti: (() => void) | null): void {
  ripartenzaFinta = riparti
}

/** Riapre l'app dalla pagina di accesso, senza nulla in memoria dell'account uscito. */
export function ripartiDaAccesso(): void {
  if (ripartenzaFinta) {
    ripartenzaFinta()
    return
  }
  window.location.replace('/login')
}
