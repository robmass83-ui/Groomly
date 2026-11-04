import { getFirestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import { invitoBetaDi } from '../../../src/lib/betaInvito'
import { chiaveGiornoRoma } from '../../../src/lib/disponibilita'
import { statoPiano, type ProMain } from '../../../src/lib/piano'
import { GIORNO_MS, avviso, betaInCorso, contattoTitolare, percorsoAvviso, proMainDi } from './comune'
import { emailBeta, inviaEmail, type Posta } from './emailBeta'

export type Promemoria = Partial<Record<'feedback' | 'fine-7' | 'fine-1' | 'finita', string>>
export type AvvisoFine = keyof Promemoria

const GIORNI_FEEDBACK = 7

/** Giorni di calendario a Roma da oggi alla fine: 0 = finisce oggi, 1 = domani. */
export function giorniAllaFine(fine: string, adesso: Date): number {
  const giorno = (data: Date) => Date.parse(`${chiaveGiornoRoma(data)}T00:00:00Z`)
  return Math.round((giorno(new Date(fine)) - giorno(adesso)) / GIORNO_MS)
}

/** Il prossimo avviso da mandare, al massimo uno per giro. Le «fine» valgono per la betaFinoAl a cui si riferivano. */
export function prossimoAvviso(promemoria: Promemoria, pro: ProMain | undefined, adesso: Date): AvvisoFine | null {
  const fine = pro?.betaFinoAl
  if (!pro || !fine) return null
  if (betaInCorso(pro, adesso)) {
    const giorni = giorniAllaFine(fine, adesso)
    if (giorni <= 1) return promemoria['fine-1'] === fine ? null : 'fine-1'
    if (giorni <= 7) return promemoria['fine-7'] === fine ? null : 'fine-7'
    const dal = pro.betaDal ? Date.parse(pro.betaDal) : NaN
    if (!promemoria.feedback && adesso.getTime() - dal >= GIORNI_FEEDBACK * GIORNO_MS) return 'feedback'
    return null
  }
  const chiusa = statoPiano(pro, adesso).livello === 'base' && Date.parse(fine) <= adesso.getTime()
  return chiusa && promemoria.finita !== fine ? 'finita' : null
}

/** Segna l'avviso mandato e quelli che non hanno più senso (un fine-1 rende inutili fine-7 e promemoria). */
function segni(tipo: AvvisoFine, promemoria: Promemoria, fine: string, adesso: Date): Promemoria {
  const feedback = promemoria.feedback ?? adesso.toISOString()
  if (tipo === 'fine-1') return { ...promemoria, 'fine-1': fine, 'fine-7': fine, feedback }
  if (tipo === 'fine-7') return { ...promemoria, 'fine-7': fine, feedback }
  if (tipo === 'feedback') return { ...promemoria, feedback: adesso.toISOString() }
  return { ...promemoria, finita: fine }
}

function promemoriaDi(valore: unknown): Promemoria {
  if (!valore || typeof valore !== 'object') return {}
  const out: Promemoria = {}
  for (const chiave of ['feedback', 'fine-7', 'fine-1', 'finita'] as const) {
    const v = (valore as Record<string, unknown>)[chiave]
    if (typeof v === 'string') out[chiave] = v
  }
  return out
}

/** Ogni mattina: promemoria feedback, fine a 7 e a 1 giorno, beta finita. Email solo per le due «fine». */
export async function mandaAvvisiFineBeta(input: { adesso?: Date; apiKey?: string; posta?: Posta } = {}): Promise<number> {
  const adesso = input.adesso ?? new Date()
  const db = getFirestore()
  const snap = await db.collection('betaInviti').where('stato', '==', 'accettato').get()
  let mandati = 0
  for (const doc of snap.docs) {
    const salonId = doc.id
    try {
      const esito = await db.runTransaction(async (tx) => {
        const invitoSnap = await tx.get(doc.ref)
        const invito = invitoBetaDi(invitoSnap.data())
        const pro = proMainDi((await tx.get(db.doc(`salons/${salonId}/pro/main`))).data())
        if (!invito || invito.stato !== 'accettato' || !pro?.betaFinoAl) return null
        const promemoria = promemoriaDi(invitoSnap.get('promemoria'))
        const tipo = prossimoAvviso(promemoria, pro, adesso)
        if (!tipo) return null
        const fine = pro.betaFinoAl
        tx.set(doc.ref, { promemoria: segni(tipo, promemoria, fine, adesso) }, { merge: true })
        tx.set(db.doc(percorsoAvviso(salonId)), avviso(tipo, invito.piano, adesso, { scadeIl: fine }))
        return { tipo, piano: invito.piano, fine }
      })
      if (!esito) continue
      mandati += 1
      if (esito.tipo !== 'fine-7' && esito.tipo !== 'fine-1') continue
      const contatto = await contattoTitolare(db, salonId)
      const mail = emailBeta(contatto.lingua, esito.tipo, { piano: esito.piano, scadeIl: esito.fine })
      if (await inviaEmail(input.apiKey ?? '', contatto.email, mail, input.posta) !== 'inviata') logger.warn('Email fine beta non inviata', { salonId })
    } catch (error) {
      logger.error('Avviso fine beta non mandato', { salonId, error })
    }
  }
  return mandati
}
