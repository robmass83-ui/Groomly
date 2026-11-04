import { getFirestore } from 'firebase-admin/firestore'
import { invitoBetaDi } from '../../../src/lib/betaInvito'
import { campiBase, scriviPiano } from '../piano/scriviPiano'
import {
  avviso, betaInCorso, contattoTitolare, nega, percorsoAvviso, proMainDi, richiediOperatore, salonIdValido, testoFacoltativo,
  type TokenOperatore,
} from './comune'
import { emailBeta, inviaEmail, type Posta } from './emailBeta'

export const TESTO_REVOCA_MAX = 400

/** Ritira un invito aperto o chiude una beta in corso (torna a Go, la traccia resta). */
export async function revocaBetaPer(input: {
  token: TokenOperatore
  salonId: unknown
  testo?: unknown
  adesso?: Date
  apiKey?: string
  posta?: Posta
}): Promise<{ ok: true; emailStato: 'inviata' | 'non_inviata' | null }> {
  richiediOperatore(input.token)
  if (!salonIdValido(input.salonId)) nega('Accesso negato')
  const salonId = input.salonId
  const testo = testoFacoltativo(input.testo, TESTO_REVOCA_MAX, 'Testo troppo lungo')
  const adesso = input.adesso ?? new Date()
  const ora = adesso.toISOString()
  const db = getFirestore()
  const invitoRef = db.doc(`betaInviti/${salonId}`)
  const proRef = db.doc(`salons/${salonId}/pro/main`)

  const esito = await db.runTransaction(async (tx) => {
    const invito = invitoBetaDi((await tx.get(invitoRef)).data())
    const pro = proMainDi((await tx.get(proRef)).data())
    if (!invito || (invito.stato !== 'invitato' && invito.stato !== 'accettato')) nega('Niente da revocare')
    if (invito.stato === 'accettato') {
      if (!betaInCorso(pro, adesso)) nega('La beta è già finita')
      tx.set(proRef, { ...scriviPiano(campiBase(true), adesso), updatedAt: ora }, { merge: true })
    }
    const tipo = invito.stato === 'invitato' ? 'invito-ritirato' as const : 'revoca' as const
    tx.set(invitoRef, { stato: 'revocato', revocatoIl: ora, testoRevoca: testo, aggiornatoIl: ora }, { merge: true })
    tx.set(db.doc(percorsoAvviso(salonId)), avviso(tipo, invito.piano, adesso, { testo }))
    return { tipo, piano: invito.piano }
  })

  const contatto = await contattoTitolare(db, salonId)
  const mail = emailBeta(contatto.lingua, esito.tipo, { piano: esito.piano, testo })
  return { ok: true, emailStato: await inviaEmail(input.apiKey ?? '', contatto.email, mail, input.posta) }
}
