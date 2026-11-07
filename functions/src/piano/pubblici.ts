import { getFirestore, type Firestore } from 'firebase-admin/firestore'
import { MESSAGGIO_SLUG_PRESO, slugConNumero, slugDaNome, slugLibero, slugRiservato } from '../../../src/lib/slug'
import { erroreDaMessaggio, erroreServer } from '../erroriServer'

const TENTATIVI = 50
/** Quanti link può tenere un salone: il nome attuale e un paio di nomi vecchi già stampati o condivisi. */
export const MAX_LINK_SALONE = 3

/**
 * Dà al salone il primo link libero del suo nome: «canespa», poi «canespa-2», «canespa-3»… Se ne ha già uno, resta quello.
 * Un salone tiene al massimo MAX_LINK_SALONE link: il nuovo libera il più vecchio, così nessuno occupa nomi a decine.
 * I nomi di Groomly e delle sue pagine non si danno a nessuno.
 */
export async function registraSlug(salonId: string, nome: string, db: Firestore = getFirestore(), adesso = new Date()): Promise<{ slug: string }> {
  const base = slugDaNome(nome)
  if (base === '' || salonId === '' || salonId === 'shared') throw erroreServer('failed-precondition', 'accesso_negato')
  if (slugRiservato(base)) throw erroreDaMessaggio('already-exists', MESSAGGIO_SLUG_PRESO)
  const slug = await db.runTransaction(async (tx) => {
    const suoi = (await tx.get(db.collection('pubblici').where('salonId', '==', salonId))).docs
    for (let numero = 1; numero <= TENTATIVI; numero += 1) {
      const candidato = slugConNumero(base, numero)
      const ref = db.doc(`pubblici/${candidato}`)
      const snap = await tx.get(ref)
      const occupato = snap.exists && typeof snap.data()?.salonId === 'string' ? String(snap.data()?.salonId) : null
      if (!slugLibero(occupato, salonId).ok) continue
      if (occupato !== salonId) {
        // I più vecchi per primi; quelli senza data sono di prima di questo limite.
        const vecchi = suoi
          .filter((doc) => doc.id !== candidato)
          .sort((a, b) => String(a.data()?.creatoIl ?? '').localeCompare(String(b.data()?.creatoIl ?? '')))
        for (const doc of vecchi.slice(0, Math.max(0, vecchi.length - (MAX_LINK_SALONE - 1)))) tx.delete(doc.ref)
        tx.set(ref, { salonId, nome: nome.trim(), slug: candidato, creatoIl: adesso.toISOString() })
      }
      return candidato
    }
    throw erroreDaMessaggio('already-exists', MESSAGGIO_SLUG_PRESO)
  })
  return { slug }
}

/** A ogni salvataggio delle impostazioni: il link del nome attuale deve aprire il salone, anche a prenotazioni spente. */
export async function slugDalSalone(salonId: string, nome: string, db: Firestore = getFirestore()): Promise<void> {
  const slug = slugDaNome(nome)
  if (slug === '' || salonId === '' || salonId === 'shared' || salonId.includes('/')) return
  const presente = (await db.doc(`pubblici/${slug}`).get()).data()
  if (presente?.salonId === salonId) return
  await registraSlug(salonId, nome, db).catch(() => undefined)
}
