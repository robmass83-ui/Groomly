import type { DocumentData, Firestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import { dataDi } from './postiLiberi'

// Le durate che la Privacy promette: richieste chiuse 90 giorni, copie di sicurezza 30.
export const GIORNI_RICHIESTE = 90
export const GIORNI_COPIA = 30
const GIORNO_MS = 86_400_000
const COPIA = 'meta/ripristino-sicurezza'

/** La data da cui contare. Le richieste di prima non hanno `chiusaIl`: vale la più recente, così non si anticipa mai. */
function chiusaDal(data: DocumentData): number | null {
  const chiusa = dataDi(data.chiusaIl)
  if (chiusa) return chiusa.getTime()
  const date = [data.end, data.start, data.consensoIl].flatMap((valore) => {
    const letta = dataDi(valore)
    return letta && !Number.isNaN(letta.getTime()) ? [letta.getTime()] : []
  })
  return date.length > 0 ? Math.max(...date) : null
}

/** Solo rifiutate e scadute, e solo con una data che si legge: nel dubbio la richiesta resta. */
export function richiestaDaCancellare(data: DocumentData, adesso: Date): boolean {
  if (data.status !== 'rifiutata' && data.status !== 'scaduta') return false
  const dal = chiusaDal(data)
  return dal !== null && adesso.getTime() - dal > GIORNI_RICHIESTE * GIORNO_MS
}

async function pulisciRichieste(db: Firestore, salonId: string, adesso: Date): Promise<number> {
  const snap = await db.collection(`salons/${salonId}/richieste`).where('status', 'in', ['rifiutata', 'scaduta'])
    .select('status', 'chiusaIl', 'end', 'start', 'consensoIl').get()
  const vecchie = snap.docs.filter((doc) => richiestaDaCancellare(doc.data(), adesso))
  if (vecchie.length === 0) return 0
  const writer = db.bulkWriter()
  for (const doc of vecchie) void writer.delete(doc.ref)
  await writer.close()
  return vecchie.length
}

// Una copia di prima non ha la data: i 30 giorni partono da qui, così chi ha appena ripristinato tiene il suo Annulla.
async function pulisciCopia(db: Firestore, salonId: string, adesso: Date): Promise<boolean> {
  const ref = db.doc(`salons/${salonId}/${COPIA}`)
  const snap = await ref.get()
  if (!snap.exists) return false
  const scade = dataDi(snap.get('scadeIl'))
  if (!scade) {
    await ref.set({ scadeIl: new Date(adesso.getTime() + GIORNI_COPIA * GIORNO_MS).toISOString() }, { merge: true })
    return false
  }
  if (scade.getTime() > adesso.getTime()) return false
  for (const file of await db.collection(`salons/${salonId}/sicurezza`).listDocuments()) await db.recursiveDelete(file)
  await ref.delete()
  return true
}

/** Il giro della notte. Un salone che fallisce non ferma gli altri. */
export async function pulisciConservazione(db: Firestore, adesso: Date): Promise<{ richieste: number; copie: number }> {
  let richieste = 0
  let copie = 0
  for (const salone of await db.collection('salons').listDocuments()) {
    if (salone.id === 'shared') continue
    try {
      richieste += await pulisciRichieste(db, salone.id, adesso)
      if (await pulisciCopia(db, salone.id, adesso)) copie += 1
    } catch (error) {
      logger.error('Conservazione del salone non applicata', { salonId: salone.id, error: error instanceof Error ? error.message : 'errore' })
    }
  }
  return { richieste, copie }
}
