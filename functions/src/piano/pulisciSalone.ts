import { FieldPath, type Firestore, type Query } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import { normalizeEmail } from '../../../src/lib/salonPath'

/** Le raccolte globali che puntano al salone: inviti, pagina pubblica, schede e suggerimenti. */
export async function pulisciRaccolteSalone(db: Firestore, salonId: string): Promise<void> {
  await cancellaQuery(db, db.collection('invites').where('salonId', '==', salonId))
  await cancellaQuery(db, db.collection('pubblici').where('salonId', '==', salonId))
  await cancellaQuery(db, db.collection('schede').where('salonId', '==', salonId))
  await cancellaQuery(db, db.collection('suggerimenti').where('salonId', '==', salonId))
}

/** I resti di una persona: tutto tranne l'accesso (Auth), che si cancella per ultimo. */
export async function pulisciPersona(db: Firestore, persona: { uid: string; emails: string[] }): Promise<void> {
  const { uid } = persona
  // I telefoni si leggono prima di cancellare l'account che li contiene.
  const devices = await db.collection(`accounts/${uid}/devices`).get()
  const telefoni = devices.docs.map((doc) => doc.id)
  await cancellaQuery(db, db.collection('suggerimenti').where('uid', '==', uid))
  await cancellaQuery(db, db.collection('pushSfide').where('uid', '==', uid))
  for (const limite of ['suggerimentiLimiti', 'placesRateLimits', 'pushRateLimits']) {
    await db.doc(`${limite}/${uid}`).delete()
  }
  await db.recursiveDelete(db.doc(`accounts/${uid}`))
  await db.recursiveDelete(db.doc(`users/${uid}`))
  await svuotaStorage(uid)
  for (const telefono of telefoni) {
    const parte = telefono.replace(/[^a-zA-Z0-9_-]+/g, '_')
    await cancellaQuery(db, db.collection('pushDeliveries')
      .orderBy(FieldPath.documentId())
      .startAt(`${parte}__`)
      .endAt(`${parte}__\uf8ff`))
  }
  const emails = [...new Set(persona.emails.map(normalizeEmail).filter((email) => email !== ''))]
  for (const email of emails) {
    await db.doc(`emailRateLimits/${email}`).delete()
  }
}

async function cancellaQuery(db: Firestore, query: Query): Promise<void> {
  const snap = await query.get()
  if (snap.empty) return
  const writer = db.bulkWriter()
  for (const doc of snap.docs) void writer.delete(doc.ref)
  await writer.close()
}

async function svuotaStorage(uid: string): Promise<void> {
  try {
    await getStorage().bucket().deleteFiles({ prefix: `users/${uid}/` })
  } catch {
    // Il bucket può mancare negli ambienti senza Storage: i dati stanno in Firestore.
  }
}
