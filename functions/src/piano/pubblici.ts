import { getFirestore } from 'firebase-admin/firestore'
import { HttpsError } from 'firebase-functions/v2/https'
import { MESSAGGIO_SLUG_PRESO, slugConNumero, slugDaNome, slugLibero } from '../../../src/lib/slug'

const TENTATIVI = 50

/** Dà al salone il primo link libero del suo nome: «canespa», poi «canespa-2», «canespa-3»… Se ne ha già uno, resta quello. */
export async function registraSlug(salonId: string, nome: string): Promise<{ slug: string }> {
  const base = slugDaNome(nome)
  if (base === '' || salonId === '' || salonId === 'shared') throw new HttpsError('failed-precondition', 'Accesso negato')
  const db = getFirestore()
  const slug = await db.runTransaction(async (tx) => {
    for (let numero = 1; numero <= TENTATIVI; numero += 1) {
      const candidato = slugConNumero(base, numero)
      const ref = db.doc(`pubblici/${candidato}`)
      const snap = await tx.get(ref)
      const occupato = snap.exists && typeof snap.data()?.salonId === 'string' ? String(snap.data()?.salonId) : null
      if (!slugLibero(occupato, salonId).ok) continue
      if (occupato !== salonId) tx.set(ref, { salonId, nome: nome.trim(), slug: candidato })
      return candidato
    }
    throw new HttpsError('already-exists', MESSAGGIO_SLUG_PRESO)
  })
  return { slug }
}

/** A ogni salvataggio delle impostazioni: il link del nome attuale deve aprire il salone, anche a prenotazioni spente. */
export async function slugDalSalone(salonId: string, nome: string): Promise<void> {
  const slug = slugDaNome(nome)
  if (slug === '' || salonId === '' || salonId === 'shared' || salonId.includes('/')) return
  const presente = (await getFirestore().doc(`pubblici/${slug}`).get()).data()
  if (presente?.salonId === salonId) return
  await registraSlug(salonId, nome).catch(() => undefined)
}
