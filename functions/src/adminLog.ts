import { getFirestore } from 'firebase-admin/firestore'

export type VoceAdmin = { azione: string; salonId?: string; dettagli?: Record<string, unknown> }

type DbRegistro = { collection: (nome: string) => { add: (voce: Record<string, unknown>) => Promise<unknown> } }

/** Una riga per azione della console. Mai dati dei clienti finali in `dettagli`. */
export async function registraAdmin(db: DbRegistro, voce: VoceAdmin, adesso = new Date()): Promise<void> {
  await db.collection('adminLog').add({
    quando: adesso.toISOString(),
    azione: voce.azione,
    salonId: voce.salonId ?? null,
    dettagli: voce.dettagli ?? {},
  })
}

/** Registra dopo che l'azione è riuscita: il registro che fallisce non disfa ciò che è già fatto. */
export async function conRegistro<T>(
  azione: string,
  dati: (esito: T) => Omit<VoceAdmin, 'azione'>,
  esegui: () => Promise<T>,
  db: DbRegistro = getFirestore() as unknown as DbRegistro,
): Promise<T> {
  const esito = await esegui()
  try {
    await registraAdmin(db, { azione, ...dati(esito) })
  } catch (error) {
    console.error('adminLog non scritto', azione, error)
  }
  return esito
}
