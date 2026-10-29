import { FieldValue, getFirestore, type DocumentData, type Firestore } from 'firebase-admin/firestore'
import { chiaveGiornoRoma, oraRoma } from '../../../src/lib/disponibilita'
import { inizioDaDoc, motivoPosto, type MotivoPosto } from '../../../src/lib/listaAttesa'
import type { RichiestaDoc } from '../../../src/lib/pianoRichiesta'
import { archivioDelCane, documentoCane, idValido } from './gestisciPrenotazione'
import { serviziAccesi } from './inviaCoda'
import { appuntamentoOccupato, intervalloAncoraLibero, richiestaOccupata } from './postiLiberi'

const TOKEN = /^[A-Za-z0-9_-]{16,128}$/

export type AzioneAttesa = 'leggi' | 'conferma' | 'rifiuta' | 'resta' | 'esci'

export type EsitoConferma =
  | { ok: true, esito: 'confermato', appointmentId: string, dogId: string }
  | { ok: true, esito: 'visto', motivo: MotivoPosto, giorno: string, ora: string }
  | { ok: true, esito: 'rifiutato' | 'restato' | 'uscito' }
  | { ok: true, esito: 'occupato' }
  | { ok: false, errore: 'token' | 'spento' }

function testo(valore: unknown): string {
  return typeof valore === 'string' ? valore.trim() : ''
}

function durataDi(valore: unknown): number {
  return typeof valore === 'number' && Number.isFinite(valore) && valore > 0 ? valore : 60
}

function prezzoDi(servizio: DocumentData | undefined, taglia: string): number {
  const prezzo = servizio?.price && typeof servizio.price === 'object' ? (servizio.price as Record<string, unknown>)[taglia] : undefined
  return typeof prezzo === 'number' && Number.isFinite(prezzo) && prezzo >= 0 ? prezzo : 0
}

/** L'inizio della prossima visita o richiesta che tiene l'ora, dopo `inizio`. Null se dopo non c'è niente. */
function prossimoOccupato(inizio: Date, adesso: Date, appuntamenti: readonly DocumentData[], richieste: readonly { id: string, data: DocumentData }[]): Date | null {
  const inizi = [
    ...appuntamenti.flatMap((data) => appuntamentoOccupato(data)).filter((voce) => (
      voce.status === 'programmato' && !(voce.provvisorio && voce.scadeIl && voce.scadeIl.getTime() <= adesso.getTime())
    )),
    ...richieste.flatMap((doc) => richiestaOccupata(doc.data)),
  ].map((voce) => voce.inizio).filter((quando) => quando.getTime() > inizio.getTime())
  if (inizi.length === 0) return null
  return new Date(Math.min(...inizi.map((quando) => quando.getTime())))
}

/**
 * Il link della mail porta qui: il token è il segreto. Tutto si decide dentro una transazione che rilegge le visite,
 * così due conferme dello stesso token scrivono una visita sola: la seconda trova l'ora già presa.
 */
export async function confermaAttesaPer(input: {
  salonId: string
  token: string
  azione: AzioneAttesa
  adesso: Date
}, db: Firestore = getFirestore()): Promise<EsitoConferma> {
  const { salonId, token, azione, adesso } = input
  if (!idValido(salonId) || !TOKEN.test(token)) return { ok: false, errore: 'token' }
  const base = `salons/${salonId}`

  const settings = (await db.doc(`${base}/settings/main`).get()).data() ?? {}
  if (!serviziAccesi(settings.serviziEmail).includes('attesa')) return { ok: false, errore: 'spento' }

  const trovate = await db.collection(`${base}/offerteAttesa`).where('token', '==', token).limit(1).get()
  const offerta = trovate.docs[0]
  const offertaDati = offerta?.data()
  const iscrittoId = testo(offertaDati?.iscrittoId)
  const appointmentId = testo(offertaDati?.appointmentId)
  const inizio = inizioDaDoc(offertaDati?.inizio)
  if (!offerta || !inizio || !idValido(iscrittoId) || !idValido(appointmentId)) return { ok: false, errore: 'token' }

  return db.runTransaction(async (tx): Promise<EsitoConferma> => {
    const iscrittoRef = db.doc(`${base}/attesa/${iscrittoId}`)
    const iscrittoSnap = await tx.get(iscrittoRef)
    const iscritto = iscrittoSnap.data()
    const attivo = iscrittoSnap.exists && iscritto?.attivo !== false

    if (azione === 'esci') {
      if (attivo) tx.update(iscrittoRef, { attivo: false })
      return { ok: true, esito: 'uscito' }
    }

    const durataMin = durataDi(iscritto?.durataMin)
    const fine = new Date(inizio.getTime() + durataMin * 60_000)
    const [appSnap, ricSnap] = await Promise.all([
      tx.get(db.collection(`${base}/appointments`)),
      tx.get(db.collection(`${base}/richieste`)),
    ])
    const appuntamenti = appSnap.docs.map((doc) => doc.data())
    const richieste = ricSnap.docs.map((doc) => ({ id: doc.id, data: doc.data() }))
    const libero = intervalloAncoraLibero({ inizio, fine, adesso, appuntamenti, richieste })
    // L'ora è presa se qualcuno la tiene al suo inizio: se solo la durata sfora, è un altro motivo.
    const presa = !intervalloAncoraLibero({ inizio, fine: new Date(inizio.getTime() + 60_000), adesso, appuntamenti, richieste })
    const motivo = motivoPosto({ inizio, adesso, durataMin, prossimoInizio: prossimoOccupato(inizio, adesso, appuntamenti, richieste), preso: presa })
    const posto = motivo === 'libero' && libero

    if (!attivo && posto) return { ok: true, esito: 'uscito' }
    if (azione === 'conferma' && !posto) return { ok: true, esito: 'occupato' }
    const visto: EsitoConferma = { ok: true, esito: 'visto', motivo, giorno: chiaveGiornoRoma(inizio), ora: oraRoma(inizio) }
    if (azione === 'leggi') return visto
    if (azione === 'rifiuta' || azione === 'resta') {
      if (!posto) return visto
      return { ok: true, esito: azione === 'rifiuta' ? 'rifiutato' : 'restato' }
    }
    if (!attivo || !iscritto) return { ok: true, esito: 'occupato' }

    // Conferma con il posto libero. Prima si legge tutto, poi si scrive.
    const nomeCane = testo(iscritto.nomeCane)
    const email = testo(iscritto.email)
    const servizioId = testo(iscritto.servizioId)
    const specie: RichiestaDoc['specie'] = iscritto.specie === 'gatto' || iscritto.specie === 'altro' ? iscritto.specie : 'cane'
    const taglia: RichiestaDoc['taglia'] = iscritto.taglia === 'piccola' || iscritto.taglia === 'grande' ? iscritto.taglia : 'media'
    const caniSnap = await tx.get(db.collection(`${base}/dogs`))
    const servizio = servizioId !== '' && idValido(servizioId) ? (await tx.get(db.doc(`${base}/services/${servizioId}`))).data() : undefined
    const tomba = (await tx.get(db.doc(`${base}/buchiAttesa/${appointmentId}`))).data()

    // Un cane deceduto non si riusa: nasce una scheda nuova. Un attivo vale più di uno non più in cura.
    const uguali = email === '' ? [] : caniSnap.docs.filter((cane) => {
      const dati = cane.data()
      const contatto = dati.contact && typeof dati.contact === 'object' ? dati.contact as Record<string, unknown> : {}
      return testo(contatto.email) === email && testo(dati.name) === nomeCane && archivioDelCane(dati.status) !== null
    })
    const esistente = uguali.find((cane) => archivioDelCane(cane.data().status) === false) ?? uguali[0]
    const visitaDisdetta = appSnap.docs.find((doc) => doc.id === appointmentId)?.data()
    const caneDisdetta = caniSnap.docs.find((cane) => cane.id === testo(visitaDisdetta?.dogId))
    const disdetto = testo(tomba?.nomeCane) || testo(caneDisdetta?.data().name) || testo(visitaDisdetta?.ospiteNome)

    const caneRef = esistente ? esistente.ref : db.collection(`${base}/dogs`).doc()
    const visitaRef = db.collection(`${base}/appointments`).doc()
    const ms = adesso.getTime()
    if (!esistente) {
      const richiesta: RichiestaDoc = {
        status: 'accettata',
        token: '',
        nome: testo(iscritto.nome),
        phone: testo(iscritto.phone),
        email,
        cane: nomeCane,
        razza: '',
        specie,
        taglia,
        foto: [],
        start: inizio.toISOString(),
        end: fine.toISOString(),
      }
      tx.set(caneRef, documentoCane(caneRef.id, richiesta, adesso))
    } else if (archivioDelCane(esistente.data().status) === true) {
      tx.update(esistente.ref, { status: 'attivo', archivedAt: FieldValue.delete(), updatedAt: ms })
    }
    tx.set(visitaRef, {
      id: visitaRef.id,
      dogId: caneRef.id,
      start: inizio.getTime(),
      end: fine.getTime(),
      services: [{ serviceId: servizioId, name: testo(iscritto.trattamento), durationMin: durataMin, price: prezzoDi(servizio, taglia) }],
      status: 'programmato',
      kind: 'pelosetto',
      createdAt: ms,
      updatedAt: ms,
    })
    tx.update(iscrittoRef, { attivo: false })
    tx.set(db.doc(`${base}/avvisiAttesa/${offerta.id}`), {
      cane: nomeCane,
      trattamento: testo(iscritto.trattamento),
      altro: disdetto,
      giorno: chiaveGiornoRoma(adesso),
      creatoIl: adesso.toISOString(),
    })
    return { ok: true, esito: 'confermato', appointmentId: visitaRef.id, dogId: caneRef.id }
  })
}
