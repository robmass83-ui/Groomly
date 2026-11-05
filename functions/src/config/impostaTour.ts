import { getFirestore } from 'firebase-admin/firestore'
import { operatoreAutorizzato } from '../../../src/lib/salonPath'
import { erroreServer } from '../erroriServer'

/** Accendere riparte da adesso; spegnere conserva il `dal` precedente. */
export function configTourDopo(
  acceso: boolean,
  adesso: Date,
  attuale: unknown,
): { acceso: boolean; dal: string | null } {
  if (acceso) return { acceso: true, dal: adesso.toISOString() }
  const dal = attuale && typeof attuale === 'object' ? (attuale as { dal?: unknown }).dal : null
  return { acceso: false, dal: typeof dal === 'string' ? dal : null }
}

export async function impostaTourPer(input: {
  admin?: boolean
  acceso: boolean
}): Promise<{ ok: true }> {
  if (!operatoreAutorizzato({ admin: input.admin })) {
    throw erroreServer('failed-precondition', 'accesso_negato')
  }
  const db = getFirestore()
  const ref = db.doc('config/globale')
  const adesso = new Date()
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    tx.set(ref, { tourBenvenuto: configTourDopo(input.acceso === true, adesso, snap.get('tourBenvenuto')) }, { merge: true })
  })
  return { ok: true }
}
