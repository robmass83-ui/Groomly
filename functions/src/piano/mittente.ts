import { createHmac, randomBytes } from 'node:crypto'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'
import { HttpsError } from 'firebase-functions/v2/https'
import { mittenteRateDecision } from '../rateLimit'

type Richiesta = { headers?: Record<string, string | string[] | undefined>; ip?: string }

/**
 * L’indirizzo da cui arriva la chiamata. Il front end di Google aggiunge in fondo a X-Forwarded-For l’indirizzo che vede:
 * quello che il client scrive da sé resta davanti e non conta.
 */
export function indirizzoDi(richiesta: Richiesta | undefined): string {
  const intestazione = richiesta?.headers?.['x-forwarded-for']
  const testo = Array.isArray(intestazione) ? intestazione.join(',') : intestazione ?? ''
  const voci = testo.split(',').map((voce) => voce.trim()).filter((voce) => voce !== '')
  const indirizzo = voci.at(-1) ?? richiesta?.ip ?? ''
  return indirizzo.slice(0, 64)
}

let chiave: string | null = null

async function chiaveMittente(db: Firestore): Promise<string> {
  if (chiave) return chiave
  const ref = db.doc('sistema/mittente')
  chiave = await db.runTransaction(async (tx) => {
    const letta = (await tx.get(ref)).get('chiave')
    if (typeof letta === 'string' && letta.length >= 32) return letta
    const nuova = randomBytes(32).toString('hex')
    tx.set(ref, { chiave: nuova })
    return nuova
  })
  return chiave
}

/** Un’impronta dell’indirizzo, con una chiave che sta solo sul server: il salone non risale all’indirizzo. Vuota senza indirizzo. */
export async function mittenteDi(richiesta: Richiesta | undefined, db: Firestore = getFirestore()): Promise<string> {
  const indirizzo = indirizzoDi(richiesta)
  if (indirizzo === '') return ''
  return createHmac('sha256', await chiaveMittente(db)).update(indirizzo).digest('hex').slice(0, 32)
}

/** Al massimo 6 moduli pubblici all’ora dalla stessa connessione, su tutti i saloni insieme. */
export async function riservaMittente(mittente: string, db: Firestore = getFirestore(), adesso = Date.now()): Promise<void> {
  if (mittente === '') return
  const ref = db.doc(`mittentiLimiti/${mittente}`)
  const ok = await db.runTransaction(async (tx) => {
    const decisione = mittenteRateDecision((await tx.get(ref)).get('hits'), adesso)
    if (decisione.ok) tx.set(ref, { hits: decisione.next })
    return decisione.ok
  })
  if (!ok) throw new HttpsError('resource-exhausted', 'Troppe richieste')
}
