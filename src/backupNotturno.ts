import { messaggioInvio, programmaInvio, provaInvioAutomatico } from './lib/driveInvio'
import type { PonteNativo } from './lib/ponteBackup'

type Esito = { esito: 'inviato' | 'saltato' | 'errore'; messaggio: string }

type Dipendenze = {
  accesso: (attesa: number) => Promise<string | null>
  prova: typeof provaInvioAutomatico
  programma: typeof programmaInvio
  now: () => Date
}

async function accessoFirebase(attesa: number): Promise<string | null> {
  const { watchAuth } = await import('./data/firebase/client')
  return new Promise((resolve) => {
    let chiudi: (() => void) | null = null
    let finito = false
    const termina = (uid: string | null) => {
      if (finito) return
      finito = true
      clearTimeout(timer)
      chiudi?.()
      resolve(uid)
    }
    const timer = setTimeout(() => termina(null), attesa)
    void watchAuth((account) => termina(account?.uid ?? null)).then((stop) => {
      chiudi = stop
      if (finito) stop()
    }, () => termina(null))
  })
}

/** Gira solo nella WebView senza schermo che Android apre all'orario del backup. */
export async function backupNotturno(ponte: PonteNativo, deps: Partial<Dipendenze> = {}): Promise<Esito> {
  const accesso = deps.accesso ?? accessoFirebase
  const prova = deps.prova ?? provaInvioAutomatico
  const programma = deps.programma ?? programmaInvio
  const now = deps.now ?? (() => new Date())
  let esito: Esito
  try {
    const uid = await accesso(60_000)
    if (!uid) {
      esito = { esito: 'errore', messaggio: 'Apri Groomly ed entra con il tuo account' }
    } else {
      const fatto = await prova(uid, now())
      if (fatto === 'saltato') await programma(uid).catch(() => undefined)
      esito = { esito: fatto, messaggio: '' }
    }
  } catch (error) {
    esito = { esito: 'errore', messaggio: messaggioInvio(error) }
  }
  ponte.fine(JSON.stringify(esito))
  return esito
}
