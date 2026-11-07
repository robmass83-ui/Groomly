import { discardPendingPhotos } from '../../lib/pendingPhoto'
import { firebaseEnabled } from '../firebase/enabled'
import { sharedMirrorKey } from '../../lib/sharedMirror'
import { dimenticaEliminazioni } from '../../lib/tombstone'

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
      // Gli avvisi di compleanno e orario scaduto si tolgono all'uscita: senza i segni, chi rientra li riceve di nuovo.
      if (key && (key === `groomly.orario-scaduto.${uid}` || key.startsWith(`groomly.orario-scaduto.${uid}.`) || key.startsWith(`groomly.compleanno.${uid}.`))) chiavi.push(key)
    }
    chiavi.push(`groomly.piano.${uid}`)
    for (const key of chiavi) localStorage.removeItem(key)
  } catch {
    // Se lo spazio locale non risponde si esce lo stesso: la ripartenza legge dal cloud.
  }
  discardPendingPhotos(uid)
}

const SEGNO = 'groomly.uscita'
const CACHE_SVUOTATA = 'groomly.uscita.cacheSvuotata'
const CACHE_DA_SVUOTARE = 'groomly.uscita.svuotaCache'

/** All'uscita la cache di Firestore è stata cancellata davvero: all'avvio non serve rifarlo. */
export function segnaCacheSvuotata(): void {
  try {
    sessionStorage.setItem(CACHE_SVUOTATA, '1')
  } catch {
    // Senza segno l'avvio la cancella di nuovo: costa poco.
  }
}

/** Da chiamare prima che Firestore parta: vero una volta sola se la cache dell'uscita va ancora cancellata. */
export function prendiCacheDaSvuotare(): boolean {
  try {
    const richiesta = sessionStorage.getItem(CACHE_DA_SVUOTARE) === '1'
    sessionStorage.removeItem(CACHE_DA_SVUOTARE)
    return richiesta
  } catch {
    return false
  }
}

/** Prima di ripartire: gli ascolti ancora aperti possono riscrivere le copie, all'avvio si ripulisce. */
export function segnaUscita(uid: string): void {
  if (!uid || !firebaseEnabled()) return
  try {
    sessionStorage.setItem(SEGNO, uid)
  } catch {
    // Senza spazio di sessione restano le pulizie fatte all'uscita.
  }
}

/** All'avvio, prima di mostrare l'app: finisce la pulizia di un'uscita appena fatta, una volta sola. */
export function finisciUscita(): void {
  let uid: string | null = null
  try {
    uid = sessionStorage.getItem(SEGNO)
    const svuotata = sessionStorage.getItem(CACHE_SVUOTATA) === '1'
    sessionStorage.removeItem(SEGNO)
    sessionStorage.removeItem(CACHE_SVUOTATA)
    // La cache non si è cancellata all'uscita (altra scheda, troppo lenta): ci riprova Firestore prima di partire.
    if (uid && !svuotata) sessionStorage.setItem(CACHE_DA_SVUOTARE, '1')
  } catch {
    return
  }
  if (!uid) return
  pulisciDatiAccount(uid)
  dimenticaEliminazioni(uid)
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
