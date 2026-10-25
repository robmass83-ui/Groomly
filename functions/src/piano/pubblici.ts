import { getFirestore } from 'firebase-admin/firestore'
import { HttpsError } from 'firebase-functions/v2/https'
import { slugDaNome, slugLibero } from '../../../src/lib/slug'

export async function registraSlug(salonId: string, nome: string): Promise<{ slug: string }> {
  const slug = slugDaNome(nome)
  if (slug === '' || salonId === '' || salonId === 'shared') throw new HttpsError('failed-precondition', 'Accesso negato')
  const db = getFirestore()
  const ref = db.doc(`pubblici/${slug}`)
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const occupato = snap.exists && typeof snap.data()?.salonId === 'string' ? String(snap.data()?.salonId) : null
    const decisione = slugLibero(occupato, salonId)
    if (!decisione.ok) throw new HttpsError('already-exists', decisione.message)
    tx.set(ref, { salonId, nome: nome.trim(), slug })
  })
  return { slug }
}
