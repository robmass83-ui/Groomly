import { getFirestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import { invitoBetaDi } from '../../../src/lib/betaInvito'
import { percorsoAvviso } from './comune'

/** Gli inviti non accettati entro 14 giorni passano a scaduto; l'avviso dell'invito si spegne. */
export async function scadiInvitiBetaScaduti(adesso = new Date()): Promise<number> {
  const db = getFirestore()
  const snap = await db.collection('betaInviti').where('stato', '==', 'invitato').get()
  let scaduti = 0
  for (const doc of snap.docs) {
    const invito = invitoBetaDi(doc.data())
    if (!invito || Date.parse(invito.scadeInvitoIl) > adesso.getTime()) continue
    try {
      const fatto = await db.runTransaction(async (tx) => {
        const fresco = invitoBetaDi((await tx.get(doc.ref)).data())
        const avvisoRef = db.doc(percorsoAvviso(doc.id))
        const avviso = await tx.get(avvisoRef)
        if (!fresco || fresco.stato !== 'invitato' || Date.parse(fresco.scadeInvitoIl) > adesso.getTime()) return false
        tx.set(doc.ref, { stato: 'scaduto', aggiornatoIl: adesso.toISOString() }, { merge: true })
        if (avviso.get('tipo') === 'invito') tx.set(avvisoRef, { letto: true }, { merge: true })
        return true
      })
      if (fatto) scaduti += 1
    } catch (error) {
      logger.error('Invito beta non scaduto', { salonId: doc.id, error })
    }
  }
  return scaduti
}
