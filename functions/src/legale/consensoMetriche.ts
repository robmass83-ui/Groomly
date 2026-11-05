import type { Firestore } from 'firebase-admin/firestore'
import { FONTI_CONSENSO_METRICHE, VERSIONE_DOCUMENTI, type ConsensoMetriche } from '../../../src/lib/versioneLegale'
import { erroreServer } from '../erroriServer'

export interface ArchivioConsenso {
  scrivi(uid: string, consenso: ConsensoMetriche, riga: Record<string, unknown>): Promise<void>
}

export function archivioConsenso(db: Firestore): ArchivioConsenso {
  return {
    async scrivi(uid, consenso, riga) {
      const batch = db.batch()
      batch.set(db.doc(`accounts/${uid}`), { consensoMetriche: consenso }, { merge: true })
      batch.set(db.collection(`accounts/${uid}/registro`).doc(), riga)
      await batch.commit()
    },
  }
}

export async function impostaConsensoMetrichePer(
  input: { uid: string; attivo: boolean; fonte: string },
  archivio: ArchivioConsenso,
  adesso: Date,
): Promise<{ ok: true; consenso: ConsensoMetriche }> {
  const fonte = FONTI_CONSENSO_METRICHE.find((voce) => voce === input.fonte)
  if (!fonte) throw erroreServer('invalid-argument', 'richiesta_non_valida')
  const consenso: ConsensoMetriche = { attivo: input.attivo, at: adesso.toISOString(), fonte, versione: VERSIONE_DOCUMENTI }
  await archivio.scrivi(input.uid, consenso, { tipo: 'consenso-metriche', ...consenso })
  return { ok: true, consenso }
}
