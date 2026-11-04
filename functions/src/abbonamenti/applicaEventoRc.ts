import { getFirestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import { scriviPiano } from '../piano/scriviPiano'
import { eventoRcDi, pianoDaEvento, salonIdDiEvento, type PianoRc } from './eventoRc'

// Il webhook è l'unica fonte del piano Play: rilegge pro/main e scrive in una transazione.
// Lo stato del webhook (ultimo evento) lo legge il controllo pre-accensione; anche l'evento di prova TEST conta.
export async function applicaEventoRc(body: unknown, adesso: Date): Promise<{ scritto: boolean; motivo?: string }> {
  const evento = eventoRcDi(body)
  if (!evento) return { scritto: false, motivo: 'evento' }
  const db = getFirestore()
  await db.doc('rcStato/webhook').set({ ultimoEventoIl: adesso.toISOString(), tipo: evento.type, ambiente: evento.environment ?? null })
  const salonId = salonIdDiEvento(evento)
  if (!salonId) return { scritto: false, motivo: evento.type === 'TEST' ? 'TEST' : 'salone' }
  const ref = db.doc(`salons/${salonId}/pro/main`)
  const esito = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const decisione = pianoDaEvento(evento, snap.exists ? snap.data() as PianoRc : undefined, adesso)
    if (decisione.azione === 'ignora') return { scritto: false, motivo: decisione.motivo }
    tx.set(ref, {
      ...scriviPiano(decisione.campi, adesso),
      rcEventoMs: decisione.ms,
      rcAmbiente: evento.environment ?? null,
      updatedAt: adesso.toISOString(),
    }, { merge: true })
    return { scritto: true }
  })
  if (!esito.scritto) logger.info('Evento RevenueCat ignorato', { id: evento.id, tipo: evento.type, motivo: esito.motivo })
  return esito
}
