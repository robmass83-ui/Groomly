import { randomUUID } from 'node:crypto'
import { getFirestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import {
  FASCE_PREZZO, GIUDIZI_FUNZIONE, LIMITE_FEEDBACK_GIORNO, PAGHERESTI, TESTO_FEEDBACK_MAX,
  type FasciaPrezzo, type FeedbackBeta, type GiudizioFunzione, type Pagheresti,
} from '../../../src/lib/betaFeedback'
import { chiaveGiornoRoma } from '../../../src/lib/disponibilita'
import { eFeature, type FeatureKey } from '../../../src/lib/piano'
import { contattoTitolare, nega, proMainDi, salonIdValido } from './comune'
import { EMAIL_OPERATORE, emailOperatore, inviaEmail, type Posta, rigaFeedbackOperatore } from './emailBeta'

const NON_VALIDO = 'beta_feedback_non_valido' as const
const VERSIONE_MAX = 40

type Risposte = Omit<FeedbackBeta, 'salonId' | 'uid' | 'piano' | 'creatoIl'>

function testo(valore: unknown, max: number): string {
  if (typeof valore !== 'string' || valore.trim().length > max) nega(NON_VALIDO)
  return valore.trim()
}

export function risposteDi(dati: unknown): Risposte {
  if (!dati || typeof dati !== 'object') nega(NON_VALIDO)
  const d = dati as Record<string, unknown>
  const voto = d.voto
  if (typeof voto !== 'number' || !Number.isInteger(voto) || voto < 1 || voto > 5) nega(NON_VALIDO)
  if (!d.funzioni || typeof d.funzioni !== 'object' || Array.isArray(d.funzioni)) nega(NON_VALIDO)
  const funzioni: Partial<Record<FeatureKey, GiudizioFunzione>> = {}
  for (const [chiave, giudizio] of Object.entries(d.funzioni)) {
    if (!eFeature(chiave) || !GIUDIZI_FUNZIONE.includes(giudizio as GiudizioFunzione)) nega(NON_VALIDO)
    funzioni[chiave] = giudizio as GiudizioFunzione
  }
  if (!PAGHERESTI.includes(d.pagheresti as Pagheresti)) nega(NON_VALIDO)
  const pagheresti = d.pagheresti as Pagheresti
  if (d.quanto !== undefined && d.quanto !== null && !FASCE_PREZZO.includes(d.quanto as FasciaPrezzo)) nega(NON_VALIDO)
  if (typeof d.ricontatto !== 'boolean' || typeof d.fineBeta !== 'boolean') nega(NON_VALIDO)
  return {
    voto: voto as Risposte['voto'],
    funzioni,
    nonVa: testo(d.nonVa, TESTO_FEEDBACK_MAX),
    manca: testo(d.manca, TESTO_FEEDBACK_MAX),
    pagheresti,
    quanto: pagheresti === 'no' ? null : (d.quanto as FasciaPrezzo | undefined) ?? null,
    ricontatto: d.ricontatto,
    fineBeta: d.fineBeta,
    versioneApp: testo(d.versioneApp, VERSIONE_MAX),
  }
}

/** Il titolare o il socio di un salone che ha fatto la beta manda il suo parere (5 al giorno per salone). */
export async function inviaFeedbackBetaPer(input: {
  uid: string
  dati: unknown
  adesso?: Date
  apiKey?: string
  posta?: Posta
}): Promise<{ ok: true }> {
  const db = getFirestore()
  const account = input.uid !== '' && !input.uid.includes('/') ? (await db.doc(`accounts/${input.uid}`).get()).data() : undefined
  const salonId = account?.salonId
  const ruolo = account?.role === undefined || account.role === null || account.role === '' ? 'titolare' : account.role
  if (!salonIdValido(salonId) || (ruolo !== 'titolare' && ruolo !== 'socio')) nega('beta_feedback_ruolo')
  const risposte = risposteDi(input.dati)
  const adesso = input.adesso ?? new Date()
  const giorno = chiaveGiornoRoma(adesso)
  const limiteRef = db.doc(`betaFeedbackLimiti/${salonId}`)

  const piano = await db.runTransaction(async (tx) => {
    const pro = proMainDi((await tx.get(db.doc(`salons/${salonId}/pro/main`))).data())
    const limite = await tx.get(limiteRef)
    if (pro?.exBeta !== true) nega('beta_feedback_solo_beta')
    const salvati = limite.get('giorno') === giorno && typeof limite.get('n') === 'number' ? limite.get('n') as number : 0
    if (salvati >= LIMITE_FEEDBACK_GIORNO) nega('beta_feedback_limite')
    const pianoBeta = pro.betaPiano ?? 'pro'
    const feedback: FeedbackBeta = { ...risposte, salonId, uid: input.uid, piano: pianoBeta, creatoIl: adesso.toISOString() }
    tx.set(limiteRef, { giorno, n: salvati + 1 })
    tx.set(db.doc(`betaFeedback/${randomUUID()}`), feedback)
    return pianoBeta
  })

  const contatto = await contattoTitolare(db, salonId)
  const funzioni = Object.entries(risposte.funzioni).map(([chiave, giudizio]) => `${chiave}: ${giudizio}`).join(', ')
  const mail = emailOperatore('feedback', [
    `Salone: ${contatto.nome || salonId} (${contatto.email || 'senza email'})`,
    `Piano: ${piano === 'salone' ? 'Salon' : 'Plus'} · voto ${risposte.voto}/5 · pagherebbe: ${risposte.pagheresti}${risposte.quanto ? ` (${risposte.quanto})` : ''}`,
    rigaFeedbackOperatore(risposte.ricontatto, risposte.fineBeta, risposte.versioneApp),
    ...(funzioni ? [`Funzioni: ${funzioni}`] : []),
    ...(risposte.nonVa ? [`Cosa non va: ${risposte.nonVa}`] : []),
    ...(risposte.manca ? [`Cosa manca: ${risposte.manca}`] : []),
  ])
  if (await inviaEmail(input.apiKey ?? '', EMAIL_OPERATORE, mail, input.posta) !== 'inviata') logger.warn('Email feedback beta non inviata', { salonId })
  return { ok: true }
}
