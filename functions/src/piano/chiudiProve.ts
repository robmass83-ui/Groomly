import { getFirestore, type DocumentData } from 'firebase-admin/firestore'
import { documentoChiuso, type CampiPiano } from './scriviPiano'

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

export async function chiudiProveScadute(adesso = new Date()): Promise<number> {
  const db = getFirestore()
  const snap = await db.collectionGroup('pro').where('stato', '==', 'prova').get()
  let chiusi = 0
  for (const doc of snap.docs) {
    if (doc.id !== 'main') continue
    const chiuso = documentoChiuso(campiDi(doc.data()), adesso)
    if (!chiuso) continue
    await doc.ref.set({ ...chiuso, updatedAt: adesso.toISOString() }, { merge: true })
    chiusi += 1
  }
  return chiusi
}
