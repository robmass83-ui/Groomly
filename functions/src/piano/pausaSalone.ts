import { FieldValue, type Firestore, type Transaction } from 'firebase-admin/firestore'
import { leggiPausa, pausaDa, ripresaDa, type PausaSalone } from '../../../src/lib/pausaSalone'
import { salonCollection } from '../../../src/lib/salonPath'

/** Quello che serve per mettere in pausa o riprendere il salone personale: impostazioni e pausa ricordata. */
export type LettoPausa = { settings: Record<string, unknown>; pausa: PausaSalone | null }

function percorso(uid: string, ...parti: string[]): string {
  return [...salonCollection(uid), ...parti].join('/')
}

/** Legge impostazioni e pausa del salone `uid`: da chiamare prima di ogni scrittura della transazione. */
export async function leggiPerPausa(tx: Transaction, db: Firestore, uid: string): Promise<LettoPausa> {
  const settingsSnap = await tx.get(db.doc(percorso(uid, 'settings', 'main')))
  const proSnap = await tx.get(db.doc(percorso(uid, 'pro', 'main')))
  return {
    settings: settingsSnap.data() ?? {},
    pausa: leggiPausa(proSnap.get('pausa')),
  }
}

/** Mette in pausa il salone: ricorda le scelte in `pro/main.pausa` e spegne prenotazioni e lista d'attesa. Una pausa già salvata resta com'è. */
export function scriviPausa(tx: Transaction, db: Firestore, uid: string, letto: LettoPausa, adesso: Date): void {
  if (letto.pausa) return
  const { pausa, settings } = pausaDa(letto.settings, adesso)
  tx.set(db.doc(percorso(uid, 'settings', 'main')), settings, { merge: true })
  tx.set(db.doc(percorso(uid, 'pro', 'main')), { pausa }, { merge: true })
}

/** Riprende il salone: rimette le scelte ricordate (se nel frattempo non sono state riaccese) e toglie la pausa. */
export function scriviRipresa(tx: Transaction, db: Firestore, uid: string, letto: LettoPausa, adesso: Date): void {
  if (!letto.pausa) return
  const ripresa = ripresaDa(letto.settings, letto.pausa, adesso)
  if (ripresa) {
    const settingsRef = db.doc(percorso(uid, 'settings', 'main'))
    const base: Record<string, unknown> = { updatedAt: ripresa.updatedAt }
    if (ripresa.prenotazioniOnline !== undefined) base.prenotazioniOnline = ripresa.prenotazioniOnline
    tx.set(settingsRef, base, { merge: true })
    if (ripresa.attesa !== undefined) {
      tx.update(settingsRef, {
        'serviziEmail.attesa': ripresa.attesa === 'togli' ? FieldValue.delete() : ripresa.attesa,
      })
    }
  }
  tx.set(db.doc(percorso(uid, 'pro', 'main')), { pausa: FieldValue.delete() }, { merge: true })
}

/** Riprende il salone `uid` in una transazione propria. */
export async function riprendiSalone(db: Firestore, uid: string, adesso: Date = new Date()): Promise<void> {
  await db.runTransaction(async (tx) => {
    const letto = await leggiPerPausa(tx, db, uid)
    scriviRipresa(tx, db, uid, letto, adesso)
  })
}
