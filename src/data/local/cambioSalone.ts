import { discardPendingPhotos } from '../../lib/pendingPhoto'
import { isSalonMirror } from '../firebase/enabled'
import { sharedMirrorKey } from '../../lib/sharedMirror'

// Le copie sul telefono stanno sotto l'uid dell'account, non sotto il salone: dopo un cambio di salone
// (invito accettato, «Torna al mio salone») quelle vecchie sono dell'altro salone e il primo salvataggio
// le scriverebbe nel nuovo. Si tolgono e si riparte da capo, così gli ascolti si aprono sul salone giusto.
// Restano l'accesso ricordato, la lingua, il telefono per le notifiche, il profilo di chi si registra,
// le preferenze dell'account e i segni (copia del cloud, copia condivisa fidata).
// Dati mai arrivati nel cloud (non segnati come copia) non si toccano: sono l'unica copia.
export function pulisciDatiSalone(uid: string): void {
  if (!uid) return
  try {
    if (!isSalonMirror(uid)) return
  } catch {
    return
  }
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
    // Se lo spazio locale non risponde la ricarica legge comunque il salone giusto dal cloud.
  }
  discardPendingPhotos(uid)
}

let ricaricaFinta: (() => void) | null = null

/** Solo per i test: sostituisce la ricarica della pagina. */
export function __impostaRicarica(ricarica: (() => void) | null): void {
  ricaricaFinta = ricarica
}

function ricarica(): void {
  if (ricaricaFinta) {
    ricaricaFinta()
    return
  }
  window.location.replace('/')
}

const SEGNO = 'groomly.cambioSalone'

/** Dopo un cambio di salone riuscito: niente si salva più, si pulisce e si riapre l'app dalla Home. */
export function dopoCambioSalone(uid: string): void {
  pulisciDatiSalone(uid)
  // Un ascolto del salone di prima può riscrivere una copia mentre la pagina si chiude:
  // il segno fa ripulire all'avvio, prima che l'app legga qualcosa.
  if (uid) {
    try {
      sessionStorage.setItem(SEGNO, uid)
    } catch {
      // Senza spazio di sessione resta la pulizia appena fatta.
    }
  }
  ricarica()
}

/** All'avvio, prima di mostrare l'app: finisce la pulizia di un cambio di salone appena fatto. */
export function finisciCambioSalone(): void {
  let uid: string | null = null
  try {
    uid = sessionStorage.getItem(SEGNO)
    sessionStorage.removeItem(SEGNO)
  } catch {
    return
  }
  if (uid) pulisciDatiSalone(uid)
}
