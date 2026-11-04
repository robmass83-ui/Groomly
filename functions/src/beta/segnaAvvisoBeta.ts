import { getFirestore } from 'firebase-admin/firestore'
import { percorsoAvviso, titolareDi } from './comune'

/** Il titolare ha visto l'avviso della beta (il client non scrive in avvisi). */
export async function segnaAvvisoBetaPer(uid: string): Promise<{ ok: true }> {
  const db = getFirestore()
  const salonId = await titolareDi(db, uid)
  const ref = db.doc(percorsoAvviso(salonId))
  await db.runTransaction(async (tx) => {
    if ((await tx.get(ref)).exists) tx.set(ref, { letto: true }, { merge: true })
  })
  return { ok: true }
}
