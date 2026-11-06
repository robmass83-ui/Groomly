import { getFirestore, type Firestore } from 'firebase-admin/firestore'
import { PIEDE_RISPOSTA, TITOLO_RISPOSTA } from '../../../src/i18n/emailHtml'
import { linguaValida, type Lingua } from '../../../src/i18n/lingua'
import {
  FONTI_ASSISTENZA,
  STATI_ASSISTENZA,
  chiaveAssistenza,
  type EsitoEmailRisposta,
  type FonteAssistenza,
  type StatoAssistenza,
} from '../../../src/lib/assistenza'
import { TESTO_MAX, TITOLO_MAX } from '../../../src/lib/avvisiSistema'
import { operatoreAutorizzato } from '../../../src/lib/salonPath'
import { postBrevoHtml } from '../brevoMail'
import { emailConsole } from '../comunicazioni/emailConsole'
import { erroreServer } from '../erroriServer'
import { liberaEmail, prenotaEmail } from '../postaGiorno'
import { risposteRateDecision } from '../rateLimit'

const ORIGINE: Record<FonteAssistenza, string> = { suggerimento: 'suggerimenti', feedback: 'betaFeedback' }
const ID_MAX = 64

type Posta = (to: string, oggetto: string, html: string) => Promise<unknown>

function richiediAdmin(admin: boolean | undefined): void {
  if (!operatoreAutorizzato({ admin })) throw erroreServer('failed-precondition', 'accesso_negato')
}

function valida(condizione: boolean): void {
  if (!condizione) throw erroreServer('invalid-argument', 'richiesta_non_valida')
}

function idValido(value: unknown): value is string {
  return typeof value === 'string' && value !== '' && value.length <= 200 && !value.includes('/')
}

function oggetto(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

function fonteDi(value: unknown): FonteAssistenza {
  valida(FONTI_ASSISTENZA.includes(value as FonteAssistenza))
  return value as FonteAssistenza
}

async function leggiOrigine(db: Firestore, fonte: FonteAssistenza, id: unknown): Promise<{ id: string; uid: string; salonId: string }> {
  valida(idValido(id))
  const dati = (await db.doc(`${ORIGINE[fonte]}/${id as string}`).get()).data()
  valida(dati !== undefined && idValido(dati.uid))
  return { id: id as string, uid: dati?.uid as string, salonId: typeof dati?.salonId === 'string' ? dati.salonId : '' }
}

/** Al massimo 30 risposte all'ora per admin. */
async function riservaRisposta(db: Firestore, uid: string, adesso: number): Promise<boolean> {
  const ref = db.doc(`assistenzaLimiti/${uid}`)
  return db.runTransaction(async (tx) => {
    const decisione = risposteRateDecision((await tx.get(ref)).get('hits'), adesso)
    if (decisione.ok) tx.set(ref, { hits: decisione.next })
    return decisione.ok
  })
}

export async function rispondiAssistenzaPer(input: {
  admin?: boolean
  adminUid: string
  dati: unknown
  apiKey?: string
  posta?: Posta
  adesso?: Date
}): Promise<{ ok: true; email: EsitoEmailRisposta }> {
  richiediAdmin(input.admin)
  const adesso = input.adesso ?? new Date()
  const db = getFirestore()
  const dati = oggetto(input.dati)
  const fonte = fonteDi(dati.fonte)
  const testo = typeof dati.testo === 'string' ? dati.testo.trim() : ''
  const idRichiesta = dati.idRichiesta
  valida(testo !== '' && testo.length <= TESTO_MAX && idValido(idRichiesta) && idRichiesta.length <= ID_MAX)
  const origine = await leggiOrigine(db, fonte, dati.id)
  const accountRef = db.doc(`accounts/${origine.uid}`)
  const account = (await accountRef.get()).data()
  if (!account) throw erroreServer('failed-precondition', 'autore_assente')
  if (!await riservaRisposta(db, input.adminUid, adesso.getTime())) throw erroreServer('resource-exhausted', 'troppe_richieste')

  const lingua = linguaValida(account.lingua) ?? 'it'
  const id = idRichiesta as string
  const ref = db.doc(`assistenza/${chiaveAssistenza(fonte, origine.id)}`)
  const avvisoRef = db.doc(`${accountRef.path}/avvisi/${id}`)
  const gia = await db.runTransaction(async (tx) => {
    const risposte = ((await tx.get(ref)).get('risposte') ?? []) as { id: string; email: EsitoEmailRisposta }[]
    const doppia = risposte.find((r) => r.id === id)
    if (doppia) return doppia
    tx.set(ref, {
      fonte,
      idOrigine: origine.id,
      salonId: origine.salonId,
      uid: origine.uid,
      stato: 'risolto',
      aggiornato: adesso.toISOString(),
      risposte: [...risposte, { id, testo, quando: adesso.toISOString(), email: null }],
    }, { merge: true })
    tx.set(avvisoRef, { tipo: 'novita', titolo: TITOLO_RISPOSTA[lingua], testo: `${testo}\n\n${PIEDE_RISPOSTA[lingua]}`, origine: 'assistenza', creato: adesso })
    return null
  })
  if (gia) return { ok: true, email: gia.email }
  if (dati.anchEmail !== true) return { ok: true, email: null }

  const email = await mandaRisposta(db, account.email, lingua, testo, adesso, input)
  await db.runTransaction(async (tx) => {
    const risposte = ((await tx.get(ref)).get('risposte') ?? []) as { id: string }[]
    tx.set(ref, { risposte: risposte.map((r) => (r.id === id ? { ...r, email } : r)) }, { merge: true })
  })
  return { ok: true, email }
}

async function mandaRisposta(db: Firestore, to: unknown, lingua: Lingua, testo: string, adesso: Date, input: { apiKey?: string; posta?: Posta }): Promise<EsitoEmailRisposta> {
  if (typeof to !== 'string' || !to.includes('@')) return 'non_inviata'
  if (!await prenotaEmail(db, adesso, 1)) return 'limite'
  const titolo = TITOLO_RISPOSTA[lingua]
  const posta: Posta = input.posta ?? ((a, oggettoMail, html) => postBrevoHtml(input.apiKey ?? '', a, oggettoMail, html, fetch, { email: 'info@groomlyapp.it', name: 'Groomly' }))
  try {
    await posta(to, titolo, emailConsole({ titolo, testo, piede: PIEDE_RISPOSTA[lingua] }))
    return 'inviata'
  } catch {
    await liberaEmail(db, adesso, 1)
    return 'non_inviata'
  }
}

export async function impostaStatoAssistenzaPer(input: { admin?: boolean; dati: unknown; adesso?: Date }): Promise<{ ok: true }> {
  richiediAdmin(input.admin)
  const db = getFirestore()
  const dati = oggetto(input.dati)
  const fonte = fonteDi(dati.fonte)
  valida(STATI_ASSISTENZA.includes(dati.stato as StatoAssistenza))
  const origine = await leggiOrigine(db, fonte, dati.id)
  await db.doc(`assistenza/${chiaveAssistenza(fonte, origine.id)}`).set({
    fonte,
    idOrigine: origine.id,
    salonId: origine.salonId,
    uid: origine.uid,
    stato: dati.stato,
    aggiornato: (input.adesso ?? new Date()).toISOString(),
  }, { merge: true })
  return { ok: true }
}

/** Fissa la data di taglio alla prima apertura: ciò che è arrivato prima non riempie la casella. */
export async function avviaAssistenzaPer(input: { admin?: boolean; adesso?: Date }): Promise<{ dal: string }> {
  richiediAdmin(input.admin)
  const db = getFirestore()
  const ref = db.doc('config/globale')
  return db.runTransaction(async (tx) => {
    const dal = (await tx.get(ref)).get('assistenzaDal')
    if (typeof dal === 'string') return { dal }
    const adesso = (input.adesso ?? new Date()).toISOString()
    tx.set(ref, { assistenzaDal: adesso }, { merge: true })
    return { dal: adesso }
  })
}

export async function salvaModelloAssistenzaPer(input: { admin?: boolean; dati: unknown }): Promise<{ id: string }> {
  richiediAdmin(input.admin)
  const dati = oggetto(input.dati)
  const titolo = typeof dati.titolo === 'string' ? dati.titolo.trim() : ''
  const testo = typeof dati.testo === 'string' ? dati.testo.trim() : ''
  valida(titolo !== '' && titolo.length <= TITOLO_MAX && testo !== '' && testo.length <= TESTO_MAX)
  valida(dati.id === undefined || idValido(dati.id))
  const raccolta = getFirestore().collection('assistenzaModelli')
  const ref = typeof dati.id === 'string' ? raccolta.doc(dati.id) : raccolta.doc()
  await ref.set({ titolo, testo })
  return { id: ref.id }
}

export async function eliminaModelloAssistenzaPer(input: { admin?: boolean; id: unknown }): Promise<{ ok: true }> {
  richiediAdmin(input.admin)
  valida(idValido(input.id))
  await getFirestore().doc(`assistenzaModelli/${input.id as string}`).delete()
  return { ok: true }
}
