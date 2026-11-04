import { getFirestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import { invitoBetaDi } from '../../../src/lib/betaInvito'
import {
  GIORNO_MS, avviso, betaInCorso, contattoTitolare, giorniValidi, nega, percorsoAvviso, proMainDi, richiediOperatore, salonIdValido,
  type TokenOperatore,
} from './comune'
import { emailBeta, inviaEmail, type Posta } from './emailBeta'

export type Estensione = { il: string; giorni: number; scadeIl: string }

/** Allunga una beta in corso dalla fine attuale, al massimo fino a 365 giorni da oggi. */
export async function estendiBetaPer(input: {
  token: TokenOperatore
  salonId: unknown
  giorni: unknown
  adesso?: Date
  apiKey?: string
  posta?: Posta
}): Promise<{ ok: true; scadeIl: string }> {
  richiediOperatore(input.token)
  if (!salonIdValido(input.salonId)) nega('accesso_negato')
  if (!giorniValidi(input.giorni)) nega('durata_non_valida')
  const salonId = input.salonId
  const giorni = input.giorni
  const adesso = input.adesso ?? new Date()
  const ora = adesso.toISOString()
  const db = getFirestore()
  const invitoRef = db.doc(`betaInviti/${salonId}`)
  const proRef = db.doc(`salons/${salonId}/pro/main`)

  const esito = await db.runTransaction(async (tx) => {
    const invitoSnap = await tx.get(invitoRef)
    const invito = invitoBetaDi(invitoSnap.data())
    const pro = proMainDi((await tx.get(proRef)).data())
    if (!invito || invito.stato !== 'accettato' || !betaInCorso(pro, adesso) || !pro?.scadeIl) nega('beta_non_in_corso')
    const scadeIl = new Date(Date.parse(pro.scadeIl) + giorni * GIORNO_MS).toISOString()
    if (Date.parse(scadeIl) > adesso.getTime() + 365 * GIORNO_MS) nega('beta_massimo_giorni')
    const prima = invitoSnap.get('estensioni')
    const estensioni: Estensione[] = [...(Array.isArray(prima) ? prima : []), { il: ora, giorni, scadeIl }]
    tx.set(proRef, { scadeIl, betaFinoAl: scadeIl, updatedAt: ora }, { merge: true })
    tx.set(invitoRef, { estensioni, aggiornatoIl: ora }, { merge: true })
    tx.set(db.doc(percorsoAvviso(salonId)), avviso('estensione', invito.piano, adesso, { scadeIl, giorni }))
    return { scadeIl, piano: invito.piano }
  })

  const contatto = await contattoTitolare(db, salonId)
  const mail = emailBeta(contatto.lingua, 'estensione', { piano: esito.piano, giorni, scadeIl: esito.scadeIl })
  if (await inviaEmail(input.apiKey ?? '', contatto.email, mail, input.posta) !== 'inviata') logger.warn('Email estensione beta non inviata', { salonId })
  return { ok: true, scadeIl: esito.scadeIl }
}
