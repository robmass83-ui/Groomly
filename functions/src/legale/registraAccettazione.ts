import type { Firestore } from 'firebase-admin/firestore'
import { DOCUMENTI_IN_VIGORE, VERSIONE_DOCUMENTI, type TerminiAccount } from '../../../src/lib/versioneLegale'
import { erroreServer } from '../erroriServer'

export interface ArchivioAccettazione {
  scrivi(uid: string, termini: TerminiAccount, idRiga: string, riga: Record<string, unknown>): Promise<void>
}

export function archivioAccettazione(db: Firestore): ArchivioAccettazione {
  return {
    async scrivi(uid, termini, idRiga, riga) {
      const batch = db.batch()
      batch.set(db.doc(`accounts/${uid}`), { termini }, { merge: true })
      batch.set(db.doc(`accounts/${uid}/registro/${idRiga}`), riga)
      await batch.commit()
    },
  }
}

export async function registraAccettazionePer(
  input: { uid: string; versione: number; appVersione: string },
  archivio: ArchivioAccettazione,
  adesso: Date,
): Promise<{ ok: true; termini: TerminiAccount }> {
  if (input.versione !== VERSIONE_DOCUMENTI) throw erroreServer('invalid-argument', 'richiesta_non_valida')
  const at = adesso.toISOString()
  const termini: TerminiAccount = { accettati: true, at, versione: input.versione, documenti: DOCUMENTI_IN_VIGORE, suServer: true }
  await archivio.scrivi(input.uid, termini, `documenti-${input.versione}`, {
    tipo: 'documenti',
    versione: input.versione,
    documenti: DOCUMENTI_IN_VIGORE,
    at,
    appVersione: input.appVersione,
  })
  return { ok: true, termini }
}
