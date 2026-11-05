import type { Firestore } from 'firebase-admin/firestore'
import { VERSIONE_DOCUMENTI, documentiPerRuolo, leggiTermini, type TerminiAccount } from '../../../src/lib/versioneLegale'
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

/** Ruolo e versione li dice l'account, non il telefono. */
export async function datiAccettazione(db: Firestore, uid: string): Promise<{ role: unknown; versioneSalvata?: number }> {
  const dati = (await db.doc(`accounts/${uid}`).get()).data()
  const versioneSalvata = leggiTermini(dati?.termini)?.versione
  return { role: dati?.role, ...(versioneSalvata !== undefined ? { versioneSalvata } : {}) }
}

export async function registraAccettazionePer(
  input: { uid: string; versione: number; versioneSalvata?: number; appVersione: string; role: unknown },
  archivio: ArchivioAccettazione,
  adesso: Date,
): Promise<{ ok: true; termini: TerminiAccount }> {
  // Una versione passata vale solo come prova di quanto già accettato: non si alza mai senza la schermata.
  if (input.versione !== VERSIONE_DOCUMENTI && input.versione !== input.versioneSalvata) throw erroreServer('invalid-argument', 'richiesta_non_valida')
  const at = adesso.toISOString()
  const documenti = documentiPerRuolo(input.role, input.versione)
  const termini: TerminiAccount = { accettati: true, at, versione: input.versione, documenti, suServer: true }
  await archivio.scrivi(input.uid, termini, `documenti-${input.versione}`, {
    tipo: 'documenti',
    versione: input.versione,
    documenti,
    at,
    appVersione: input.appVersione,
  })
  return { ok: true, termini }
}
