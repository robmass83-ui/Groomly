import { randomBytes } from 'node:crypto'
import { FieldValue, getFirestore, type Firestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import { campiBase, scriviPiano } from '../piano/scriviPiano'
import { eventoRcDi, idRcDiEvento, idRcValido, pianoDaEvento, type EventoRc, type PianoRc } from './eventoRc'

/**
 * L'id con cui l'app si presenta a RevenueCat: casuale e creato qui, uno per salone. Il salonId è scritto nelle pagine
 * pubbliche, quindi non può dire a chi va un acquisto: il webhook accetta solo id che ha dato lui.
 * rcSaloni/{salonId} → { rcId } e rcUtenti/{rcId} → { salonId }; nessun client li legge o li scrive.
 */
export async function idAcquistiPer(salonId: string, db: Firestore = getFirestore()): Promise<string> {
  const salone = db.doc(`rcSaloni/${salonId}`)
  return db.runTransaction(async (tx) => {
    const gia = (await tx.get(salone)).data()?.rcId
    if (typeof gia === 'string' && idRcValido(gia)) return gia
    const rcId = `g_${randomBytes(16).toString('hex')}`
    tx.set(salone, { rcId, creatoIl: new Date().toISOString() })
    tx.set(db.doc(`rcUtenti/${rcId}`), { salonId })
    return rcId
  })
}

async function salonIdDi(db: Firestore, rcId: string): Promise<string | null> {
  const salonId = (await db.doc(`rcUtenti/${rcId}`).get()).data()?.salonId
  return typeof salonId === 'string' && salonId !== '' && salonId !== 'shared' && !salonId.includes('/') ? salonId : null
}

async function salonePerEvento(db: Firestore, evento: EventoRc): Promise<string | null> {
  for (const id of idRcDiEvento(evento)) {
    const salonId = await salonIdDi(db, id)
    if (salonId) return salonId
  }
  return null
}

// Prezzo e offerta non decidono il piano; ma uno sconto «fondatori» su un salone che non ne ha diritto va guardato a mano.
async function segnalaSconto(db: Firestore, evento: EventoRc, salonId: string, attuale: PianoRc | undefined, adesso: Date): Promise<void> {
  const offerta = (evento.offer_code ?? '').trim()
  if (offerta === '' || attuale?.earlyAdopter === true) return
  await db.doc(`rcSegnalazioni/${evento.id}`).set({
    salonId,
    tipo: 'offerta-senza-diritto',
    offerta,
    prodotto: evento.product_id ?? null,
    prezzo: evento.price ?? null,
    valuta: evento.currency ?? null,
    at: adesso.toISOString(),
  })
  logger.warn('Offerta RevenueCat su un salone senza diritto', { id: evento.id, salonId, offerta })
}

/** TRANSFER: l'acquisto lascia i saloni di partenza. Quelli con un piano Play tornano a base: nessun piano senza un pagamento. */
async function chiudiPartenze(db: Firestore, evento: EventoRc, adesso: Date): Promise<number> {
  let chiusi = 0
  for (const id of (evento.transferred_from ?? []).filter(idRcValido)) {
    const salonId = await salonIdDi(db, id)
    if (!salonId) continue
    const ref = db.doc(`salons/${salonId}/pro/main`)
    const fatto = await db.runTransaction(async (tx) => {
      const attuale = (await tx.get(ref)).data() as PianoRc | undefined
      if (attuale?.fonte !== 'play') return false
      tx.set(ref, { ...scriviPiano(campiBase(true), adesso), rcProdotto: FieldValue.delete(), updatedAt: adesso.toISOString() }, { merge: true })
      return true
    })
    if (fatto) chiusi += 1
  }
  logger.warn('Abbonamento RevenueCat trasferito', { id: evento.id, da: evento.transferred_from ?? [], a: evento.transferred_to ?? [], chiusi })
  return chiusi
}

// Il webhook è l'unica fonte del piano Play: rilegge pro/main e scrive in una transazione.
// Lo stato del webhook (ultimo evento) lo legge il controllo pre-accensione; anche l'evento di prova TEST conta.
export async function applicaEventoRc(body: unknown, adesso: Date): Promise<{ scritto: boolean; motivo?: string }> {
  const evento = eventoRcDi(body)
  if (!evento) return { scritto: false, motivo: 'evento' }
  const db = getFirestore()
  await db.doc('rcStato/webhook').set({ ultimoEventoIl: adesso.toISOString(), tipo: evento.type, ambiente: evento.environment ?? null })
  if (evento.type === 'TRANSFER') {
    const chiusi = await chiudiPartenze(db, evento, adesso)
    return chiusi > 0 ? { scritto: true } : { scritto: false, motivo: 'TRANSFER' }
  }
  const salonId = await salonePerEvento(db, evento)
  if (!salonId) {
    const motivo = evento.type === 'TEST' ? 'TEST' : 'salone'
    if (motivo === 'salone') logger.warn('Evento RevenueCat senza un salone noto', { id: evento.id, tipo: evento.type, utente: evento.app_user_id ?? null })
    return { scritto: false, motivo }
  }
  const ref = db.doc(`salons/${salonId}/pro/main`)
  const esito = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const attuale = snap.exists ? snap.data() as PianoRc : undefined
    const decisione = pianoDaEvento(evento, attuale, adesso)
    if (decisione.azione === 'ignora') return { scritto: false, motivo: decisione.motivo, attuale }
    tx.set(ref, {
      ...scriviPiano(decisione.campi, adesso),
      rcEventoMs: decisione.ms,
      rcAmbiente: evento.environment ?? null,
      rcProdotto: decisione.prodotto ?? FieldValue.delete(),
      updatedAt: adesso.toISOString(),
    }, { merge: true })
    return { scritto: true, attuale }
  })
  await segnalaSconto(db, evento, salonId, esito.attuale, adesso)
  if (!esito.scritto) logger.info('Evento RevenueCat ignorato', { id: evento.id, tipo: evento.type, motivo: esito.motivo })
  return esito.scritto ? { scritto: true } : { scritto: false, motivo: esito.motivo }
}
