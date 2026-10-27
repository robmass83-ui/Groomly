import { getFirestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import { pianoRichiesta } from '../../../src/lib/pianoRichiesta'
import { applicaPiano, leggiRichiesta, mailDopoScrittura } from './gestisciPrenotazione'

export interface ProspettoRichiesta {
  id: string
  status: string
  scadeIl?: string
  appointmentId?: string
}

// Pura: sceglie le proposte la cui finestra è chiusa. Una proposta senza data valida conta come chiusa,
// come in pianoRichiesta, così non resta appesa a occupare un posto.
export function proposteScadute(docs: ProspettoRichiesta[], adesso: Date): { id: string; appointmentId?: string }[] {
  return docs.flatMap((doc) => {
    if (doc.status !== 'proposta') return []
    const quando = doc.scadeIl ? new Date(doc.scadeIl).getTime() : Number.NaN
    if (!Number.isNaN(quando) && quando > adesso.getTime()) return []
    return [{ id: doc.id, ...(doc.appointmentId ? { appointmentId: doc.appointmentId } : {}) }]
  })
}

// Niente indice di gruppo: si scorrono i saloni e per ciascuno si chiede solo status == 'proposta'.
export async function scadiProposteScadute(apiKey: string, adesso = new Date()): Promise<number> {
  const db = getFirestore()
  const saloni = await db.collection('salons').listDocuments()
  let chiuse = 0
  for (const salone of saloni) {
    if (salone.id === 'shared') continue
    const snap = await salone.collection('richieste').where('status', '==', 'proposta').get()
    if (snap.empty) continue
    const dati = new Map(snap.docs.map((doc) => [doc.id, doc.data()]))
    const scadute = proposteScadute(snap.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        status: typeof data.status === 'string' ? data.status : '',
        ...(typeof data.scadeIl === 'string' ? { scadeIl: data.scadeIl } : {}),
        ...(typeof data.appointmentId === 'string' && data.appointmentId ? { appointmentId: data.appointmentId } : {}),
      }
    }), adesso)
    for (const voce of scadute) {
      try {
        const richiesta = leggiRichiesta(dati.get(voce.id) ?? {})
        if (!richiesta) continue
        const piano = pianoRichiesta({ richiesta, comando: { azione: 'scade' }, token: '', adesso, orarioLibero: false, animaleArchivio: false })
        if (!piano.ok) continue
        const scritto = await applicaPiano({ salonId: salone.id, id: voce.id, richiesta, piano, adesso })
        if (!scritto.ok) continue
        chiuse += 1
        await mailDopoScrittura({ apiKey, salonId: salone.id, id: voce.id, richiesta, piano })
      } catch (error) {
        logger.error('Proposta non chiusa', { salonId: salone.id, id: voce.id, error: error instanceof Error ? error.message : 'errore' })
      }
    }
  }
  return chiuse
}
