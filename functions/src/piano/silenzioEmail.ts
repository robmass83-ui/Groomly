import { HttpsError } from 'firebase-functions/v2/https'
import { bloccaCane, type RigaCoda, type StatoCoda, type TipoCoda } from '../../../src/lib/codaEmail'

const TOKEN = /^[A-Za-z0-9_-]{16,128}$/
const TIPI = new Set<TipoCoda>(['promemoria', 'pronto', 'auguri', 'recensione', 'attesa'])
const STATI = new Set<StatoCoda>(['in_coda', 'fermata', 'inviata', 'non_inviata', 'chiusa'])

export interface ArchivioSilenzio {
  leggiRiga(salonId: string, token: string): Promise<{ dogId: string } | null>
  caneEsiste(salonId: string, dogId: string): Promise<boolean>
  segnaBloccata(salonId: string, dogId: string): Promise<void>
  leggiRighe(salonId: string, dogId: string): Promise<RigaCoda[]>
  scriviFermate(salonId: string, righe: readonly RigaCoda[]): Promise<void>
}

interface Lettura {
  id: string
  get(field: string): unknown
  data(): Record<string, unknown>
}

interface QueryCoda {
  limit(n: number): { get(): Promise<{ docs: Lettura[] }> }
  get(): Promise<{ docs: Lettura[] }>
}

export interface DbSilenzio {
  collection(path: string): {
    where(field: string, op: string, value: string): QueryCoda
    doc(id: string): unknown
  }
  doc(path: string): {
    get(): Promise<{ exists: boolean }>
    set(data: { emailBloccata: true }, options: { merge: true }): Promise<unknown>
  }
  batch(): {
    update(ref: unknown, data: { stato: StatoCoda; motivo: string }): void
    commit(): Promise<unknown>
  }
}

export function rigaDaDati(id: string, data: Record<string, unknown>): RigaCoda | null {
  const tipo = data.tipo
  const stato = data.stato
  const dogId = data.dogId
  if (typeof dogId !== 'string' || dogId === '' || !TIPI.has(tipo as TipoCoda) || !STATI.has(stato as StatoCoda)) return null
  return {
    id,
    tipo: tipo as TipoCoda,
    dogId,
    appointmentId: typeof data.appointmentId === 'string' ? data.appointmentId : null,
    evento: typeof data.evento === 'string' ? data.evento : id,
    parteIl: typeof data.parteIl === 'string' ? data.parteIl : null,
    stato: stato as StatoCoda,
    motivo: typeof data.motivo === 'string' ? data.motivo : '',
    email: typeof data.email === 'string' ? data.email : '',
    nomeCane: typeof data.nomeCane === 'string' ? data.nomeCane : '',
  }
}

export function archivioDaDb(db: DbSilenzio): ArchivioSilenzio {
  return {
    async leggiRiga(salonId, token) {
      const snap = await db.collection(`salons/${salonId}/coda`).where('token', '==', token).limit(1).get()
      const trovato = snap.docs[0]
      if (!trovato) return null
      const dogId = trovato.get('dogId')
      return typeof dogId === 'string' && dogId !== '' ? { dogId } : null
    },
    async caneEsiste(salonId, dogId) {
      return (await db.doc(`salons/${salonId}/dogs/${dogId}`).get()).exists
    },
    async segnaBloccata(salonId, dogId) {
      await db.doc(`salons/${salonId}/dogs/${dogId}`).set({ emailBloccata: true }, { merge: true })
    },
    async leggiRighe(salonId, dogId) {
      const snap = await db.collection(`salons/${salonId}/coda`).where('dogId', '==', dogId).get()
      const righe: RigaCoda[] = []
      for (const item of snap.docs) {
        const riga = rigaDaDati(item.id, item.data())
        if (riga) righe.push(riga)
      }
      return righe
    },
    async scriviFermate(salonId, righe) {
      const batch = db.batch()
      for (const riga of righe) {
        batch.update(db.collection(`salons/${salonId}/coda`).doc(riga.id), { stato: riga.stato, motivo: riga.motivo })
      }
      await batch.commit()
    },
  }
}

export async function silenzioEmailPer(
  input: { salonId: string; token: string },
  archivio: ArchivioSilenzio,
): Promise<{ ok: true }> {
  if (input.salonId === '' || input.salonId === 'shared' || input.salonId.includes('/') || !TOKEN.test(input.token)) {
    throw new HttpsError('invalid-argument', 'Link non valido')
  }
  const riga = await archivio.leggiRiga(input.salonId, input.token)
  if (!riga || riga.dogId.includes('/')) throw new HttpsError('not-found', 'Link non valido')
  if (!(await archivio.caneEsiste(input.salonId, riga.dogId))) throw new HttpsError('not-found', 'Cane assente')
  await archivio.segnaBloccata(input.salonId, riga.dogId)
  const righe = await archivio.leggiRighe(input.salonId, riga.dogId)
  const dopo = bloccaCane(righe, riga.dogId)
  const fermate = dopo.filter((voce, indice) => righe[indice]?.stato !== voce.stato)
  if (fermate.length > 0) await archivio.scriviFermate(input.salonId, fermate)
  return { ok: true }
}
