import { createHmac, randomBytes } from 'node:crypto'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'
import { lettureRateDecision, mittenteRateDecision } from '../rateLimit'
import { erroreServer } from '../erroriServer'

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

/**
 * La connessione, non il singolo indirizzo: chi ha IPv6 riceve di solito un'intera rete /64 e può cambiare indirizzo a piacere.
 * Un IPv4 resta com'è, anche quando arriva scritto come ::ffff:1.2.3.4.
 */
export function reteDi(indirizzo: string): string {
  const pulito = indirizzo.trim().toLowerCase()
  if (!pulito.includes(':')) return pulito
  const ipv4 = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(pulito)
  if (ipv4) return ipv4[1]
  const [testa, coda] = pulito.split('::')
  const prima = testa === '' ? [] : testa.split(':')
  const dopo = coda === undefined || coda === '' ? [] : coda.split(':')
  const zeri = coda === undefined ? 0 : Math.max(0, 8 - prima.length - dopo.length)
  const gruppi = [...prima, ...Array<string>(zeri).fill('0'), ...dopo]
  return gruppi.slice(0, 4).map((gruppo) => gruppo.replace(/^0+(?=.)/, '')).join(':')
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
  return createHmac('sha256', await chiaveMittente(db)).update(reteDi(indirizzo)).digest('hex').slice(0, 32)
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
  if (!ok) throw erroreServer('resource-exhausted', 'troppe_richieste')
}

/** Le letture del calendario pubblico: un conto a parte, perché chi sceglie un giorno ne fa molte più di 6. */
export async function riservaLettura(mittente: string, db: Firestore = getFirestore(), adesso = Date.now()): Promise<void> {
  if (mittente === '') return
  const ref = db.doc(`mittentiLetture/${mittente}`)
  const ok = await db.runTransaction(async (tx) => {
    const decisione = lettureRateDecision((await tx.get(ref)).get('hits'), adesso)
    if (decisione.ok) tx.set(ref, { hits: decisione.next })
    return decisione.ok
  })
  if (!ok) throw erroreServer('resource-exhausted', 'troppe_richieste')
}
