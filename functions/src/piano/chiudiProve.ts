import { getFirestore, type DocumentData } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import { pianoScaduto, type CampiPiano } from './scriviPiano'

function campiDi(data: DocumentData): CampiPiano {
  const piano = data.piano === 'pro' || data.piano === 'salone' ? data.piano : 'base'
  const stati = ['attivo', 'prova', 'grazia', 'sospeso', 'disdetto', 'scaduto'] as const
  const stato = stati.includes(data.stato) ? data.stato : 'scaduto'
  const fonti = ['play', 'prova', 'omaggio', 'manuale'] as const
  const fonte = fonti.includes(data.fonte) ? data.fonte : null
  return {
    piano,
    stato,
    fonte,
    scadeIl: typeof data.scadeIl === 'string' ? data.scadeIl : null,
    seatsIncluded: typeof data.seatsIncluded === 'number' ? data.seatsIncluded : 0,
    seatsExtra: typeof data.seatsExtra === 'number' ? data.seatsExtra : 0,
    provaUsata: data.provaUsata === true,
    rinnovoAutomatico: data.rinnovoAutomatico === true,
  }
}

// Ogni documento si rilegge e si scrive in una transazione: se nel frattempo il piano è stato rinnovato o concesso,
// la chiusura non lo sovrascrive. Un errore su un documento si registra e non ferma gli altri.
export async function chiudiProveScadute(adesso = new Date()): Promise<number> {
  const db = getFirestore()
  const snap = await db.collectionGroup('pro').where('stato', 'in', ['attivo', 'prova', 'grazia', 'disdetto']).get()
  let chiusi = 0
  for (const doc of snap.docs) {
    if (doc.id !== 'main') continue
    if (!pianoScaduto(campiDi(doc.data()), adesso)) continue
    try {
      const chiuso = await db.runTransaction(async (tx) => {
        const fresco = await tx.get(doc.ref)
        const dati = fresco.exists ? fresco.data() : undefined
        const campi = dati ? pianoScaduto(campiDi(dati), adesso) : null
        if (!campi) return false
        tx.set(doc.ref, { ...campi, updatedAt: adesso.toISOString() }, { merge: true })
        return true
      })
      if (chiuso) chiusi += 1
    } catch (error) {
      logger.error('Piano scaduto non chiuso', { path: doc.ref.path, error })
    }
  }
  return chiusi
}
