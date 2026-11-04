import { getFirestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import { ALTRO_RIFIUTO_MAX, MOTIVI_RIFIUTO_BETA, invitoBetaDi, type MotivoRifiutoBeta } from '../../../src/lib/betaInvito'
import { eVip } from '../../../src/lib/funzioniPiano'
import { campiBeta, scriviPiano, tracciaBeta } from '../piano/scriviPiano'
import { membroTitolareMancante } from '../piano/titolareMembro'
import { contattoTitolare, nega, percorsoAvviso, pianoCheBlocca, proMainDi, testoFacoltativo, titolareDi } from './comune'
import { EMAIL_OPERATORE, emailOperatore, inviaEmail, type Posta } from './emailBeta'

const NON_VALIDA = 'Risposta non valida'

type Risposta = { accetta: true } | { accetta: false; motivo: MotivoRifiutoBeta | null; altro: string | null }

function rispostaDi(dati: unknown): Risposta {
  if (!dati || typeof dati !== 'object') nega(NON_VALIDA)
  const { accetta, motivo, altro } = dati as Record<string, unknown>
  if (accetta === true) return { accetta: true }
  if (accetta !== false) nega(NON_VALIDA)
  if (motivo !== undefined && motivo !== null && !MOTIVI_RIFIUTO_BETA.includes(motivo as MotivoRifiutoBeta)) nega(NON_VALIDA)
  const scelto = (motivo ?? null) as MotivoRifiutoBeta | null
  const testo = testoFacoltativo(altro, ALTRO_RIFIUTO_MAX, NON_VALIDA)
  return { accetta: false, motivo: scelto, altro: scelto === 'altro' ? testo : null }
}

export async function rispondiInvitoBetaPer(input: {
  uid: string
  dati: unknown
  adesso?: Date
  apiKey?: string
  posta?: Posta
}): Promise<{ ok: true; scadeIl: string | null }> {
  const db = getFirestore()
  const salonId = await titolareDi(db, input.uid)
  const risposta = rispostaDi(input.dati)
  const adesso = input.adesso ?? new Date()
  const ora = adesso.toISOString()
  const invitoRef = db.doc(`betaInviti/${salonId}`)
  const proRef = db.doc(`salons/${salonId}/pro/main`)
  const avvisoRef = db.doc(percorsoAvviso(salonId))
  const memberRef = db.doc(`salons/${salonId}/members/${salonId}`)

  const esito = await db.runTransaction(async (tx) => {
    const invito = invitoBetaDi((await tx.get(invitoRef)).data())
    const pro = proMainDi((await tx.get(proRef)).data())
    const avvisoSnap = await tx.get(avvisoRef)
    const memberSnap = await tx.get(memberRef)
    const account = (await tx.get(db.doc(`accounts/${salonId}`))).data()
    if (!invito || invito.stato !== 'invitato') nega('Invito non più valido')
    if (Date.parse(invito.scadeInvitoIl) <= adesso.getTime()) {
      tx.set(invitoRef, { stato: 'scaduto', aggiornatoIl: ora }, { merge: true })
      return { scaduto: true as const }
    }
    if (risposta.accetta) {
      if (eVip(pro)) nega('Il piano VIP resta attivo')
      if (pianoCheBlocca(pro, adesso)) nega('Hai già un piano attivo')
    }
    const segnaLetto = () => {
      if (avvisoSnap.exists) tx.set(avvisoRef, { letto: true }, { merge: true })
    }
    if (!risposta.accetta) {
      tx.set(invitoRef, { stato: 'rifiutato', rispostoIl: ora, motivoRifiuto: risposta.motivo, altroRifiuto: risposta.altro, aggiornatoIl: ora }, { merge: true })
      segnaLetto()
      return { scaduto: false as const, scadeIl: null, piano: invito.piano }
    }
    const campi = scriviPiano(campiBeta(invito.piano, invito.giorni, adesso), adesso)
    const fine = campi.scadeIl as string
    tx.set(proRef, { ...campi, ...tracciaBeta(invito.piano, adesso, fine), updatedAt: ora }, { merge: true })
    if (invito.piano === 'salone') {
      const membro = membroTitolareMancante(salonId, memberSnap.exists, account)
      if (membro) tx.set(memberRef, membro)
    }
    tx.set(invitoRef, { stato: 'accettato', rispostoIl: ora, aggiornatoIl: ora }, { merge: true })
    segnaLetto()
    return { scaduto: false as const, scadeIl: fine, piano: invito.piano }
  })
  if (esito.scaduto) nega('Invito scaduto')

  if (!risposta.accetta) {
    const contatto = await contattoTitolare(db, salonId)
    const mail = emailOperatore('rifiuto', [
      `Salone: ${contatto.nome || salonId} (${contatto.email || 'senza email'})`,
      `Piano: ${esito.piano === 'salone' ? 'Salon' : 'Plus'}`,
      `Motivo: ${risposta.motivo ?? 'non indicato'}`,
      ...(risposta.altro ? [`Altro: ${risposta.altro}`] : []),
    ])
    if (await inviaEmail(input.apiKey ?? '', EMAIL_OPERATORE, mail, input.posta) !== 'inviata') logger.warn('Email rifiuto beta non inviata', { salonId })
  }
  return { ok: true, scadeIl: esito.scadeIl }
}
