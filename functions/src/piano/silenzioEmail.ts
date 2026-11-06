import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import type { Firestore } from 'firebase-admin/firestore'
import { bloccaCane, emailValida, type RigaCoda, type StatoCoda, type TipoCoda } from '../../../src/lib/codaEmail'
import { normalizeEmail } from '../../../src/lib/salonPath'
import { erroreServer } from '../erroriServer'

const TOKEN = /^[A-Za-z0-9_-]{16,128}$/
const TIPI = new Set<TipoCoda>(['promemoria', 'pronto', 'auguri', 'recensione', 'attesa'])
const STATI = new Set<StatoCoda>(['in_coda', 'fermata', 'inviata', 'non_inviata', 'chiusa'])

export type FonteBlocco = 'link' | 'scheda'

export function chiaveEmail(email: string): string {
  return createHash('sha256').update(normalizeEmail(email)).digest('hex')
}

let chiaveLink: string | null = null

/** La chiave dei link di disiscrizione: sta solo sul server, in una raccolta che il client non legge. */
export async function chiaveSilenzio(db: Firestore): Promise<string> {
  if (chiaveLink) return chiaveLink
  const ref = db.doc('sistema/silenzio')
  chiaveLink = await db.runTransaction(async (tx) => {
    const letta = (await tx.get(ref)).data()?.chiave
    if (typeof letta === 'string' && letta.length >= 32) return letta
    const nuova = randomBytes(32).toString('hex')
    tx.set(ref, { chiave: nuova })
    return nuova
  })
  return chiaveLink
}

/** La firma sta solo nel link spedito: chi legge il token nel salone non può calcolarla. */
export function firmaSilenzio(chiave: string, salonId: string, token: string): string {
  return createHmac('sha256', chiave).update(`${salonId}\n${token}`).digest('hex').slice(0, 32)
}

function firmaValida(chiave: string, salonId: string, token: string, firma: string): boolean {
  const attesa = Buffer.from(firmaSilenzio(chiave, salonId, token))
  const ricevuta = Buffer.from(firma)
  return ricevuta.length === attesa.length && timingSafeEqual(ricevuta, attesa)
}

export interface ArchivioSilenzio {
  leggiRiga(salonId: string, token: string): Promise<{ dogId: string; email: string } | null>
  /** Il token di un'offerta di posto libero: l'iscritto può non avere un cane. */
  leggiOfferta(salonId: string, token: string): Promise<{ email: string } | null>
  caneEsiste(salonId: string, dogId: string): Promise<boolean>
  emailCane(salonId: string, dogId: string): Promise<string | null>
  caniConEmail(salonId: string, email: string): Promise<string[]>
  segnaBloccata(salonId: string, dogId: string, bloccata: boolean): Promise<void>
  leggiBlocco(salonId: string, email: string): Promise<FonteBlocco | null>
  scriviBlocco(salonId: string, email: string, fonte: FonteBlocco): Promise<void>
  togliBlocco(salonId: string, email: string): Promise<void>
  leggiRighe(salonId: string, dogId: string): Promise<RigaCoda[]>
  scriviFermate(salonId: string, righe: readonly RigaCoda[]): Promise<void>
}

export function rigaDaDati(id: string, data: Record<string, unknown>): RigaCoda | null {
  const tipo = data.tipo
  const stato = data.stato
  const dogId = data.dogId
  if (typeof dogId !== 'string' || dogId === '' || !TIPI.has(tipo as TipoCoda) || !STATI.has(stato as StatoCoda)) return null
  return {
    id,
    tipo: tipo as TipoCoda,
    dogId,
    appointmentId: typeof data.appointmentId === 'string' ? data.appointmentId : null,
    evento: typeof data.evento === 'string' ? data.evento : id,
    parteIl: typeof data.parteIl === 'string' ? data.parteIl : null,
    stato: stato as StatoCoda,
    motivo: typeof data.motivo === 'string' ? data.motivo : '',
    email: typeof data.email === 'string' ? data.email : '',
    nomeCane: typeof data.nomeCane === 'string' ? data.nomeCane : '',
    nomeCliente: typeof data.nomeCliente === 'string' ? data.nomeCliente : '',
    inizio: typeof data.inizio === 'string' ? data.inizio : null,
  }
}

function emailDi(data: Record<string, unknown> | undefined): string {
  const contact = data?.contact
  if (!contact || typeof contact !== 'object') return ''
  const email = (contact as Record<string, unknown>).email
  return typeof email === 'string' ? email : ''
}

export function archivioDaDb(db: Firestore): ArchivioSilenzio {
  const blocco = (salonId: string, email: string) => db.doc(`salons/${salonId}/emailBloccate/${chiaveEmail(email)}`)
  return {
    async leggiRiga(salonId, token) {
      const snap = await db.collection(`salons/${salonId}/coda`).where('token', '==', token).limit(1).get()
      const trovato = snap.docs[0]
      if (!trovato) return null
      const dogId = trovato.get('dogId')
      const email = trovato.get('email')
      return typeof dogId === 'string' && dogId !== '' ? { dogId, email: typeof email === 'string' ? email : '' } : null
    },
    async leggiOfferta(salonId, token) {
      const snap = await db.collection(`salons/${salonId}/offerteAttesa`).where('token', '==', token).limit(1).get()
      const iscrittoId = snap.docs[0]?.get('iscrittoId')
      if (typeof iscrittoId !== 'string' || iscrittoId === '' || iscrittoId.includes('/')) return null
      const email = (await db.doc(`salons/${salonId}/attesa/${iscrittoId}`).get()).get('email')
      return typeof email === 'string' && emailValida(email) ? { email } : null
    },
    async caneEsiste(salonId, dogId) {
      return (await db.doc(`salons/${salonId}/dogs/${dogId}`).get()).exists
    },
    async emailCane(salonId, dogId) {
      const snap = await db.doc(`salons/${salonId}/dogs/${dogId}`).get()
      return snap.exists ? emailDi(snap.data()) : null
    },
    async caniConEmail(salonId, email) {
      const cercata = normalizeEmail(email)
      const snap = await db.collection(`salons/${salonId}/dogs`).select('contact').get()
      return snap.docs.filter((item) => normalizeEmail(emailDi(item.data())) === cercata).map((item) => item.id)
    },
    async segnaBloccata(salonId, dogId, bloccata) {
      await db.doc(`salons/${salonId}/dogs/${dogId}`).set({ emailBloccata: bloccata }, { merge: true })
    },
    async leggiBlocco(salonId, email) {
      const snap = await blocco(salonId, email).get()
      if (!snap.exists) return null
      return snap.get('fonte') === 'link' ? 'link' : 'scheda'
    },
    async scriviBlocco(salonId, email, fonte) {
      await blocco(salonId, email).set({ email: normalizeEmail(email), at: new Date().toISOString(), fonte })
    },
    async togliBlocco(salonId, email) {
      await blocco(salonId, email).delete()
    },
    async leggiRighe(salonId, dogId) {
      const snap = await db.collection(`salons/${salonId}/coda`).where('dogId', '==', dogId).get()
      const righe: RigaCoda[] = []
      for (const item of snap.docs) {
        const riga = rigaDaDati(item.id, item.data())
        if (riga) righe.push(riga)
      }
      return righe
    },
    async scriviFermate(salonId, righe) {
      const batch = db.batch()
      for (const riga of righe) {
        batch.update(db.collection(`salons/${salonId}/coda`).doc(riga.id), { stato: riga.stato, motivo: riga.motivo })
      }
      await batch.commit()
    },
  }
}

async function fermaCane(salonId: string, dogId: string, archivio: ArchivioSilenzio): Promise<void> {
  await archivio.segnaBloccata(salonId, dogId, true)
  const righe = await archivio.leggiRighe(salonId, dogId)
  const dopo = bloccaCane(righe, dogId)
  const fermate = dopo.filter((voce, indice) => righe[indice]?.stato !== voce.stato)
  if (fermate.length > 0) await archivio.scriviFermate(salonId, fermate)
}

function salonePermesso(salonId: string): boolean {
  return salonId !== '' && salonId !== 'shared' && !salonId.includes('/')
}

async function destinatarioDelLink(
  input: { salonId: string; token: string },
  archivio: ArchivioSilenzio,
): Promise<{ email: string; dogId: string | null }> {
  if (!salonePermesso(input.salonId) || !TOKEN.test(input.token)) {
    throw erroreServer('invalid-argument', 'link_non_valido')
  }
  const riga = await archivio.leggiRiga(input.salonId, input.token)
  if (riga && riga.dogId.includes('/')) throw erroreServer('not-found', 'link_non_valido')
  const offerta = riga ? null : await archivio.leggiOfferta(input.salonId, input.token)
  if (!riga && !offerta) throw erroreServer('not-found', 'link_non_valido')
  if (riga && !(await archivio.caneEsiste(input.salonId, riga.dogId))) throw erroreServer('not-found', 'cane_assente')
  return { email: riga?.email ?? offerta?.email ?? '', dogId: riga?.dogId ?? null }
}

// Chi si disiscrive esce da tutto il salone: l'indirizzo va in elenco e si fermano tutti i suoi cani.
export async function silenzioEmailPer(
  input: { salonId: string; token: string },
  archivio: ArchivioSilenzio,
): Promise<{ ok: true }> {
  const { email, dogId } = await destinatarioDelLink(input, archivio)
  const cani = new Set(dogId ? [dogId] : [])
  if (emailValida(email)) {
    await archivio.scriviBlocco(input.salonId, email, 'link')
    for (const id of await archivio.caniConEmail(input.salonId, email)) cani.add(id)
  }
  for (const id of cani) await fermaCane(input.salonId, id, archivio)
  return { ok: true }
}

// Il ritorno è del cliente: chi ha il link della sua email toglie il blocco, chiunque l'abbia messo.
// Il token da solo non basta, perché il salone lo legge: serve la firma, che esiste solo nell'email.
export async function riattivaEmailPer(
  input: { salonId: string; token: string; firma: string; chiave: string },
  archivio: ArchivioSilenzio,
): Promise<{ ok: true }> {
  if (!firmaValida(input.chiave, input.salonId, input.token, input.firma)) throw erroreServer('not-found', 'link_non_valido')
  const { email, dogId } = await destinatarioDelLink(input, archivio)
  const cani = new Set(dogId ? [dogId] : [])
  if (emailValida(email)) {
    await archivio.togliBlocco(input.salonId, email)
    for (const id of await archivio.caniConEmail(input.salonId, email)) cani.add(id)
  }
  for (const id of cani) await archivio.segnaBloccata(input.salonId, id, false)
  return { ok: true }
}

export async function impostaEmailClientePer(
  input: { salonId: string; ruolo: string; dogId: string; bloccata: boolean },
  archivio: ArchivioSilenzio,
): Promise<{ ok: true }> {
  if (!salonePermesso(input.salonId) || input.dogId === '' || input.dogId.includes('/')) {
    throw erroreServer('invalid-argument', 'richiesta_non_valida')
  }
  if (input.ruolo !== 'titolare' && input.ruolo !== 'socio') throw erroreServer('permission-denied', 'accesso_negato')
  const email = await archivio.emailCane(input.salonId, input.dogId)
  if (email === null) throw erroreServer('not-found', 'cane_assente')
  const cani = new Set([input.dogId])
  if (emailValida(email)) {
    // Il no del cliente prevale: dopo il link il salone non riaccende e non lo trasforma in una scelta sua.
    const blocco = await archivio.leggiBlocco(input.salonId, email)
    if (blocco === 'link' && !input.bloccata) throw erroreServer('failed-precondition', 'email_disiscritta')
    if (input.bloccata && blocco !== 'link') await archivio.scriviBlocco(input.salonId, email, 'scheda')
    if (!input.bloccata) await archivio.togliBlocco(input.salonId, email)
    for (const dogId of await archivio.caniConEmail(input.salonId, email)) cani.add(dogId)
  }
  for (const dogId of cani) {
    if (input.bloccata) await fermaCane(input.salonId, dogId, archivio)
    else await archivio.segnaBloccata(input.salonId, dogId, false)
  }
  return { ok: true }
}
