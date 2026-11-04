import { randomUUID } from 'node:crypto'
import { getFirestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import { eVip } from '../../../src/lib/funzioniPiano'
import { GIORNI_SCADENZA_INVITO, MESSAGGIO_INVITO_MAX, invitoBetaDi, type InvitoBeta } from '../../../src/lib/betaInvito'
import {
  GIORNO_MS, avviso, betaInCorso, contattoTitolare, giorniValidi, nega, percorsoAvviso, pianoCheBlocca, proMainDi,
  richiediOperatore, testoFacoltativo, type TokenOperatore,
} from './comune'
import { emailBeta, inviaEmail, type Posta } from './emailBeta'

export type MotivoSalto = 'vip' | 'shared' | 'gia-invitato' | 'piano-attivo' | 'non-trovato'
export type EsitoInviti = { invitati: string[]; saltati: { salonId: string; motivo: MotivoSalto }[] }

const NON_VALIDO = 'Invito non valido'

function idValido(id: string): boolean {
  return id !== '' && !id.includes('/')
}

export async function invitaBetaPer(input: {
  token: TokenOperatore
  salonIds: unknown
  piano: unknown
  giorni: unknown
  messaggio?: unknown
  adesso?: Date
  apiKey?: string
  posta?: Posta
}): Promise<EsitoInviti> {
  richiediOperatore(input.token)
  const { salonIds, piano, giorni } = input
  if (!Array.isArray(salonIds) || salonIds.length < 1 || salonIds.length > 50 || !salonIds.every((id) => typeof id === 'string')) nega(NON_VALIDO)
  if (piano !== 'pro' && piano !== 'salone') nega(NON_VALIDO)
  if (!giorniValidi(giorni)) nega(NON_VALIDO)
  const messaggio = testoFacoltativo(input.messaggio, MESSAGGIO_INVITO_MAX, NON_VALIDO)
  const adesso = input.adesso ?? new Date()
  const scadeInvitoIl = new Date(adesso.getTime() + GIORNI_SCADENZA_INVITO * GIORNO_MS).toISOString()
  const db = getFirestore()
  const esito: EsitoInviti = { invitati: [], saltati: [] }

  for (const salonId of [...new Set(salonIds as string[])]) {
    if (salonId === 'shared') {
      esito.saltati.push({ salonId, motivo: 'shared' })
      continue
    }
    if (!idValido(salonId)) {
      esito.saltati.push({ salonId, motivo: 'non-trovato' })
      continue
    }
    const motivo = await db.runTransaction(async (tx): Promise<MotivoSalto | null> => {
      const invitoRef = db.doc(`betaInviti/${salonId}`)
      const account = (await tx.get(db.doc(`accounts/${salonId}`))).data()
      const pro = proMainDi((await tx.get(db.doc(`salons/${salonId}/pro/main`))).data())
      const vecchioSnap = await tx.get(invitoRef)
      const ruolo = account?.role
      if (!account || account.salonId !== salonId || (ruolo !== undefined && ruolo !== null && ruolo !== '' && ruolo !== 'titolare')) return 'non-trovato'
      if (eVip(pro)) return 'vip'
      const vecchio = invitoBetaDi(vecchioSnap.data())
      const aperto = vecchio?.stato === 'invitato' && Date.parse(vecchio.scadeInvitoIl) > adesso.getTime()
      if (aperto || betaInCorso(pro, adesso)) return 'gia-invitato'
      if (pianoCheBlocca(pro, adesso)) return 'piano-attivo'
      if (vecchioSnap.exists) tx.set(db.doc(`betaInviti/${salonId}/storico/${randomUUID()}`), vecchioSnap.data() ?? {})
      const invito: InvitoBeta = {
        salonId,
        piano,
        giorni,
        messaggio,
        stato: 'invitato',
        invitatoIl: adesso.toISOString(),
        scadeInvitoIl,
        rispostoIl: null,
        motivoRifiuto: null,
        altroRifiuto: null,
        revocatoIl: null,
        invitatoDa: input.token.operatorEmail.trim().toLowerCase(),
        aggiornatoIl: adesso.toISOString(),
      }
      tx.set(invitoRef, invito)
      tx.set(db.doc(percorsoAvviso(salonId)), avviso('invito', piano, adesso, { scadeIl: scadeInvitoIl, giorni, testo: messaggio }))
      return null
    })
    if (motivo) esito.saltati.push({ salonId, motivo })
    else esito.invitati.push(salonId)
  }

  await Promise.all(esito.invitati.map(async (salonId) => {
    const contatto = await contattoTitolare(db, salonId)
    const mail = emailBeta(contatto.lingua, 'invito', { piano, giorni, scadeIl: scadeInvitoIl, testo: messaggio })
    const stato = await inviaEmail(input.apiKey ?? '', contatto.email, mail, input.posta)
    if (stato !== 'inviata') logger.warn('Email invito beta non inviata', { salonId })
  }))
  return esito
}
