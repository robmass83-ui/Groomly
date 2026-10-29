import { getFirestore, type Firestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import { linguaValida, type Lingua } from '../../../src/i18n/lingua'
import { emailValida, type StatoCoda, type TipoCoda } from '../../../src/lib/codaEmail'
import type { IscrittoAttesa } from '../../../src/lib/listaAttesa'
import { notaProblemaDelGiorno } from '../../../src/lib/righeServizio'
import { romeDay } from '../../../src/lib/romeTime'
import { salonCollection } from '../../../src/lib/salonPath'
import { buchiDaTombe, tombeDaTogliere } from './offerteAttesa'
import {
  applicaEsito,
  inviaCoda,
  inviaOfferteAttesa,
  righeDelMinuto,
  serviziAccesi,
  serviziConOperatore,
  type AttesaMinuto,
  type CaneMinuto,
  type OffertaAttesaDoc,
  type RigaInvio,
  type VisitaMinuto,
} from './inviaCoda'

const TIPI = new Set<TipoCoda>(['promemoria', 'pronto', 'auguri', 'recensione', 'attesa'])
const STATI = new Set<StatoCoda>(['in_coda', 'fermata', 'inviata', 'non_inviata', 'chiusa'])

function dataDi(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  if (typeof value === 'number' && Number.isFinite(value)) return new Date(value)
  if (typeof value === 'string') {
    const data = new Date(value)
    return Number.isNaN(data.getTime()) ? null : data
  }
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    const data = (value as { toDate: () => Date }).toDate()
    return data instanceof Date && !Number.isNaN(data.getTime()) ? data : null
  }
  return null
}

function caneDi(id: string, data: Record<string, unknown>): CaneMinuto | null {
  const contact = data.contact && typeof data.contact === 'object' ? data.contact as Record<string, unknown> : {}
  const nome = typeof data.name === 'string' ? data.name : ''
  if (nome === '' && typeof contact.name !== 'string') return null
  const cane: CaneMinuto = {
    id,
    nome: nome || (typeof contact.name === 'string' ? contact.name : ''),
    nomeCliente: typeof contact.name === 'string' ? contact.name : '',
    email: typeof contact.email === 'string' ? contact.email : '',
    attivo: data.status === 'attivo' && data.emailBloccata !== true,
  }
  if (typeof data.birthMonth === 'number') cane.birthMonth = data.birthMonth
  if (typeof data.birthDay === 'number') cane.birthDay = data.birthDay
  return cane
}

function visitaDi(id: string, data: Record<string, unknown>, adesso: Date): VisitaMinuto | null {
  void adesso
  if (data.kind === 'personale') return null
  const start = dataDi(data.start)
  if (!start) return null
  const status = typeof data.status === 'string' ? data.status : ''
  const services = Array.isArray(data.services) ? data.services : []
  const minuti = services.reduce((totale, item) => {
    if (!item || typeof item !== 'object') return totale
    const durata = (item as { durationMin?: unknown }).durationMin
    return totale + (typeof durata === 'number' ? durata : 0)
  }, 0)
  const chiusura = dataDi(data.chiusoIl)
  const aggiornata = dataDi(data.updatedAt)
  const giornoVisita = chiusura ? romeDay(chiusura) : romeDay(start)
  const note = Array.isArray(data.extraNotes) ? data.extraNotes : []
  const noteProblema = notaProblemaDelGiorno(
    note.flatMap((item) => {
      if (!item || typeof item !== 'object') return []
      const testo = typeof (item as { text?: unknown }).text === 'string' ? (item as { text: string }).text : ''
      return [{ text: testo, createdAt: dataDi((item as { createdAt?: unknown }).createdAt) }]
    }),
    giornoVisita,
  )
  return {
    id,
    dogId: typeof data.dogId === 'string' ? data.dogId : '',
    start,
    status,
    nomeCane: '',
    minuti,
    chiusoIl: chiusura ? chiusura.toISOString() : null,
    noteProblema,
    ...(aggiornata ? { updatedAt: aggiornata } : {}),
  }
}

function rigaLetta(id: string, data: Record<string, unknown>): RigaInvio | null {
  if (typeof data.dogId !== 'string' || data.dogId === '' || !TIPI.has(data.tipo as TipoCoda) || !STATI.has(data.stato as StatoCoda)) {
    return null
  }
  const riga: RigaInvio = {
    id,
    tipo: data.tipo as TipoCoda,
    dogId: data.dogId,
    appointmentId: typeof data.appointmentId === 'string' ? data.appointmentId : null,
    evento: typeof data.evento === 'string' ? data.evento : id,
    parteIl: typeof data.parteIl === 'string' ? data.parteIl : null,
    stato: data.stato as StatoCoda,
    motivo: typeof data.motivo === 'string' ? data.motivo : '',
    email: typeof data.email === 'string' ? data.email : '',
    nomeCane: typeof data.nomeCane === 'string' ? data.nomeCane : '',
    nomeCliente: typeof data.nomeCliente === 'string' ? data.nomeCliente : '',
    inizio: typeof data.inizio === 'string' ? data.inizio : null,
  }
  if (typeof data.token === 'string' && data.token !== '') riga.token = data.token
  if (typeof data.url === 'string' && data.url !== '') riga.url = data.url
  return riga
}

function attesaDi(value: unknown): AttesaMinuto[] {
  if (!Array.isArray(value)) return []
  const voci: AttesaMinuto[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const raw = item as Record<string, unknown>
    const id = typeof raw.id === 'string' ? raw.id : ''
    const dogId = typeof raw.dogId === 'string' ? raw.dogId : ''
    const preferenza = raw.preferenza === 'mattina' || raw.preferenza === 'pomeriggio' || raw.preferenza === 'qualsiasi' ? raw.preferenza : null
    const arrivato = typeof raw.arrivato === 'string' ? raw.arrivato : ''
    const durataMin = typeof raw.durataMin === 'number' ? raw.durataMin : 0
    if (id === '' || dogId === '' || !preferenza || arrivato === '') continue
    const voce: AttesaMinuto = { id, dogId, durataMin, preferenza, arrivato }
    if (typeof raw.giorno === 'string' && raw.giorno !== '') voce.giorno = raw.giorno
    voci.push(voce)
  }
  return voci
}

function iscrittoDi(id: string, data: Record<string, unknown>): IscrittoAttesa | null {
  if (data.attivo === false) return null
  const testo = (valore: unknown) => (typeof valore === 'string' ? valore : '')
  const specie = data.specie === 'gatto' || data.specie === 'altro' ? data.specie : 'cane'
  const taglia = data.taglia === 'piccola' || data.taglia === 'grande' ? data.taglia : 'media'
  return {
    id,
    nome: testo(data.nome),
    phone: testo(data.phone),
    email: testo(data.email),
    nomeCane: testo(data.nomeCane),
    specie,
    taglia,
    servizioId: testo(data.servizioId),
    trattamento: testo(data.trattamento),
    durataMin: typeof data.durataMin === 'number' ? data.durataMin : 0,
    creatoIl: testo(data.creatoIl),
  }
}

function offertaDi(id: string, data: Record<string, unknown>): OffertaAttesaDoc {
  return {
    id,
    token: typeof data.token === 'string' ? data.token : '',
    appointmentId: typeof data.appointmentId === 'string' ? data.appointmentId : '',
    iscrittoId: typeof data.iscrittoId === 'string' ? data.iscrittoId : '',
    inizio: typeof data.inizio === 'string' ? data.inizio : '',
    inviataIl: typeof data.inviataIl === 'string' && data.inviataIl !== '' ? data.inviataIl : null,
    url: typeof data.url === 'string' ? data.url : '',
  }
}

function proposteDi(value: unknown): { dogId: string; at: string }[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const dogId = typeof (item as { dogId?: unknown }).dogId === 'string' ? (item as { dogId: string }).dogId : ''
    const at = typeof (item as { at?: unknown }).at === 'string' ? (item as { at: string }).at : ''
    if (dogId === '' || Number.isNaN(new Date(at).getTime())) return []
    return [{ dogId, at }]
  })
}

function firma(riga: RigaInvio): string {
  return JSON.stringify({
    tipo: riga.tipo,
    dogId: riga.dogId,
    appointmentId: riga.appointmentId,
    evento: riga.evento,
    parteIl: riga.parteIl,
    stato: riga.stato,
    motivo: riga.motivo,
    email: riga.email,
    nomeCane: riga.nomeCane,
    nomeCliente: riga.nomeCliente,
    inizio: riga.inizio,
    token: riga.token ?? '',
    url: riga.url ?? '',
  })
}

function datiRiga(riga: RigaInvio): Record<string, unknown> {
  const dati: Record<string, unknown> = {
    tipo: riga.tipo,
    dogId: riga.dogId,
    appointmentId: riga.appointmentId,
    evento: riga.evento,
    parteIl: riga.parteIl,
    stato: riga.stato,
    motivo: riga.motivo,
    email: riga.email,
    nomeCane: riga.nomeCane,
    nomeCliente: riga.nomeCliente,
    inizio: riga.inizio,
  }
  if (riga.token) dati.token = riga.token
  if (riga.url) dati.url = riga.url
  return dati
}

async function scriviRighe(db: Firestore, radice: string, prima: readonly RigaInvio[], dopo: readonly RigaInvio[]): Promise<void> {
  const vecchie = new Map(prima.map((riga) => [riga.id, firma(riga)]))
  const nuove = new Map(dopo.filter((riga) => riga.id !== '' && !riga.id.includes('/')).map((riga) => [riga.id, riga]))
  const operazioni: { id: string; riga?: RigaInvio }[] = []
  for (const [id, riga] of nuove) {
    if (vecchie.get(id) !== firma(riga)) operazioni.push({ id, riga })
  }
  for (const id of vecchie.keys()) {
    if (!nuove.has(id) && !id.includes('/')) operazioni.push({ id })
  }
  for (let inizio = 0; inizio < operazioni.length; inizio += 400) {
    const batch = db.batch()
    for (const operazione of operazioni.slice(inizio, inizio + 400)) {
      const ref = db.doc(`${radice}/coda/${operazione.id}`)
      if (operazione.riga) batch.set(ref, datiRiga(operazione.riga), { merge: true })
      else batch.delete(ref)
    }
    await batch.commit()
  }
}

async function emailOggi(db: Firestore, adesso: Date): Promise<number> {
  const snap = await db.doc('sistema/postaGiorno').get()
  if (snap.get('giorno') !== romeDay(adesso)) return 0
  const n = snap.get('n')
  return typeof n === 'number' && n > 0 ? n : 0
}

async function salvaEmailOggi(db: Firestore, adesso: Date, n: number): Promise<void> {
  await db.doc('sistema/postaGiorno').set({ giorno: romeDay(adesso), n })
}

function rigaImpostazione(riga: RigaInvio): Record<string, unknown> {
  return { id: riga.id, ...datiRiga(riga) }
}

function righeDaImpostazioni(value: unknown): RigaInvio[] {
  if (!Array.isArray(value)) return []
  const righe: RigaInvio[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const raw = item as Record<string, unknown>
    const id = typeof raw.id === 'string' ? raw.id : ''
    const riga = rigaLetta(id, raw)
    if (riga) righe.push(riga)
  }
  return righe
}

async function scriviCodaImpostazioni(
  db: Firestore,
  path: string,
  prima: readonly RigaInvio[],
  dopo: readonly RigaInvio[],
): Promise<void> {
  const scritte = dopo.map(rigaImpostazione)
  if (JSON.stringify(prima.map(rigaImpostazione)) === JSON.stringify(scritte)) return
  await db.doc(path).set({ codaEmail: scritte }, { merge: true })
}

export async function fermaCodaRiga(input: { salonId: string; id: string }): Promise<boolean> {
  if (input.salonId === '' || input.salonId.includes('/') || input.id === '' || input.id.includes('/')) return false
  const db = getFirestore()
  const radice = salonCollection(input.salonId).join('/')
  const settingsRef = db.doc(`${radice}/settings/main`)
  const settings = (await settingsRef.get()).data() ?? {}
  const esistenti = righeDaImpostazioni(settings.codaEmail)
  const riga = esistenti.find((item) => item.id === input.id)
  if (!riga || (riga.stato !== 'in_coda' && riga.stato !== 'non_inviata')) return false
  const fermata: RigaInvio = { ...riga, stato: 'fermata', motivo: 'fermata' }
  const dopo = esistenti.map((item) => (item.id === riga.id ? fermata : item))
  await scriviCodaImpostazioni(db, `${radice}/settings/main`, esistenti, dopo)
  return true
}

export async function inviaSubitoRiga(input: {
  salonId: string
  id: string
  apiKey: string
  fetchImpl?: typeof fetch
}): Promise<{ stato: StatoCoda; motivo: string } | null> {
  if (input.salonId === '' || input.salonId.includes('/') || input.id === '' || input.id.includes('/')) return null
  const db = getFirestore()
  const adesso = new Date()
  const radice = salonCollection(input.salonId).join('/')
  const settingsRef = db.doc(`${radice}/settings/main`)
  const settingsSnap = await settingsRef.get()
  const settings = settingsSnap.data() ?? {}
  const esistenti = righeDaImpostazioni(settings.codaEmail)
  const riga = esistenti.find((item) => item.id === input.id)
  if (!riga) return null
  const business = settings.business && typeof settings.business === 'object' ? settings.business as Record<string, unknown> : {}
  const nome = typeof business.salonName === 'string' ? business.salonName.trim() : ''
  const accountSnap = input.salonId === 'shared' ? null : await db.doc(`accounts/${input.salonId}`).get()
  const emailAccount = typeof accountSnap?.get('email') === 'string' ? accountSnap.get('email') : ''
  const replyTo = emailValida(emailAccount) ? { email: emailAccount.trim(), name: nome || 'Groomly' } : undefined
  const lingua: Lingua = linguaValida(settings.linguaClienti) ?? 'it'
  const emailSpedite = await emailOggi(db, adesso)
  const esito = await inviaCoda({
    apiKey: input.apiKey,
    righe: [riga],
    emailOggi: emailSpedite,
    salonId: input.salonId,
    lingua,
    salone: nome,
    replyTo,
    fetchImpl: input.fetchImpl,
    subito: true,
  })
  let aggiornata = applicaEsito([riga], esito)[0] ?? riga
  if (esito.attese.includes(riga.id) && aggiornata.motivo !== 'pagina_assente' && !emailValida(aggiornata.email)) {
    aggiornata = { ...aggiornata, stato: 'in_coda', motivo: 'manca_email' }
  }
  const dopo = esistenti.map((item) => (item.id === aggiornata.id ? aggiornata : item))
  await scriviRighe(db, radice, esistenti, dopo)
  await scriviCodaImpostazioni(db, `${radice}/settings/main`, esistenti, dopo)
  if (esito.inviate > 0) await salvaEmailOggi(db, adesso, emailSpedite + esito.inviate)
  return { stato: aggiornata.stato, motivo: aggiornata.motivo }
}

export async function giraInvioCoda(input: {
  apiKey: string
  adesso?: Date
  fetchImpl?: typeof fetch
}): Promise<{ saloni: number; inviate: number }> {
  const db = getFirestore()
  const adesso = input.adesso ?? new Date()
  const refs = await db.collection('salons').listDocuments()
  const ids = [...new Set([...refs.map((ref) => ref.id), 'shared'])].filter((id) => id !== '' && !id.includes('/'))
  let emailSpedite = await emailOggi(db, adesso)
  let saloni = 0
  let inviate = 0
  for (const salonId of ids) {
    try {
      const radice = salonCollection(salonId).join('/')
      const settingsSnap = await db.doc(`${radice}/settings/main`).get()
      const settings = settingsSnap.data() ?? {}
      const proSnap = await db.doc(`${radice}/pro/main`).get()
      const servizi = serviziConOperatore(settings.serviziEmail, proSnap.get('funzioni'))
      if (serviziAccesi(servizi).length === 0) continue

      const [dogsSnap, appointmentsSnap, codaSnap, pubbliciSnap, accountSnap, iscrittiSnap, offerteSnap, tombeSnap] = await Promise.all([
        db.collection(`${radice}/dogs`).select('name', 'contact', 'status', 'emailBloccata', 'birthMonth', 'birthDay').get(),
        db.collection(`${radice}/appointments`).select('kind', 'start', 'status', 'dogId', 'services', 'chiusoIl', 'end', 'updatedAt', 'extraNotes').get(),
        db.collection(`${radice}/coda`).get(),
        db.collection('pubblici').where('salonId', '==', salonId).limit(1).get(),
        salonId === 'shared' ? Promise.resolve(null) : db.doc(`accounts/${salonId}`).get(),
        db.collection(`${radice}/attesa`).get(),
        db.collection(`${radice}/offerteAttesa`).get(),
        db.collection(`${radice}/buchiAttesa`).get(),
      ])
      const tombeSalvate = tombeSnap.docs.map((doc) => ({ id: doc.id, data: doc.data() as Record<string, unknown> }))
      const iscritti = iscrittiSnap.docs.flatMap((doc) => {
        const iscritto = iscrittoDi(doc.id, doc.data())
        return iscritto ? [iscritto] : []
      })
      const offerteSalvate = offerteSnap.docs.map((doc) => offertaDi(doc.id, doc.data()))
      const cani = dogsSnap.docs.flatMap((doc) => {
        const cane = caneDi(doc.id, doc.data())
        return cane ? [cane] : []
      })
      const visite = appointmentsSnap.docs.flatMap((doc) => {
        const visita = visitaDi(doc.id, doc.data(), adesso)
        return visita ? [visita] : []
      })
      const dalRegistro = codaSnap.docs.flatMap((doc) => {
        const riga = rigaLetta(doc.id, doc.data())
        return riga ? [riga] : []
      })
      const dalleImpostazioni = righeDaImpostazioni(settings.codaEmail)
      const presenti = new Set(dalleImpostazioni.flatMap((riga) => [riga.id, riga.evento]))
      const esistenti = [
        ...dalRegistro.filter((riga) => !presenti.has(riga.id) && !presenti.has(riga.evento)),
        ...dalleImpostazioni,
      ]
      const business = settings.business && typeof settings.business === 'object' ? settings.business as Record<string, unknown> : {}
      const nome = typeof business.salonName === 'string' ? business.salonName.trim() : ''
      const emailAccount = typeof accountSnap?.get('email') === 'string' ? accountSnap.get('email') : ''
      const replyTo = emailValida(emailAccount) ? { email: emailAccount.trim(), name: nome || 'Groomly' } : undefined
      const lingua: Lingua = linguaValida(settings.linguaClienti) ?? 'it'
      const link = typeof settings.linkRecensioni === 'string' && settings.linkRecensioni.trim().startsWith('https://')
        ? settings.linkRecensioni.trim()
        : ''
      const nate = righeDelMinuto({
        adesso,
        servizi,
        esistenti,
        visite,
        cani,
        attesa: attesaDi(settings.attesa),
        slug: pubbliciSnap.docs[0]?.id ?? '',
        linkRecensioni: link,
        proposte: proposteDi(settings.proposteRecensione),
        iscritti,
        offerte: offerteSalvate,
        buchi: buchiDaTombe(tombeSalvate, adesso),
      })
      const esito = await inviaCoda({
        apiKey: input.apiKey,
        righe: nate.daSpedire,
        emailOggi: emailSpedite,
        salonId,
        lingua,
        salone: nome,
        replyTo,
        fetchImpl: input.fetchImpl,
        adesso,
      })
      const dopo = applicaEsito(nate.righe, esito)
      await scriviRighe(db, radice, esistenti, dopo)
      await scriviCodaImpostazioni(db, `${radice}/settings/main`, esistenti, dopo)
      emailSpedite += esito.inviate
      inviate += esito.inviate
      const dopoOfferte = new Map(offerteSalvate.map((offerta) => [offerta.id, offerta]))
      let scritturaOfferteFallita = false
      if (nate.offerteAttesa.length > 0) {
        const scrivi = (offerta: OffertaAttesaDoc) => db.doc(`${radice}/offerteAttesa/${offerta.id}`).set(offerta).then(() => undefined)
        // Ogni offerta si scrive appena è partita, prima della successiva: un errore ferma il giro.
        const offerte = await inviaOfferteAttesa({
          apiKey: input.apiKey,
          offerte: nate.offerteAttesa,
          iscritti,
          emailOggi: emailSpedite,
          lingua,
          salone: nome,
          replyTo,
          fetchImpl: input.fetchImpl,
          adesso,
          salva: scrivi,
        })
        emailSpedite += offerte.inviate
        inviate += offerte.inviate
        if (offerte.inviate > 0) await salvaEmailOggi(db, adesso, emailSpedite)
        scritturaOfferteFallita = offerte.scritturaFallita
        if (scritturaOfferteFallita) {
          logger.error('Offerta della lista non salvata dopo l’invio', { salonId })
        } else {
          for (const offerta of offerte.offerte) {
            // Le offerte nuove ma non partite si salvano una volta; quelle già salvate restano com’erano.
            if (!offerta.inviataIl && !dopoOfferte.has(offerta.id)) await scrivi(offerta)
          }
        }
        for (const offerta of offerte.offerte) dopoOfferte.set(offerta.id, offerta)
      }
      if (tombeSalvate.length > 0 && !scritturaOfferteFallita) {
        const daTogliere = tombeDaTogliere({
          tombe: tombeSalvate,
          offerte: [...dopoOfferte.values()],
          adesso,
        })
        for (const id of daTogliere) await db.doc(`${radice}/buchiAttesa/${id}`).delete()
      }
      saloni += 1
      if (esito.inviate > 0) await salvaEmailOggi(db, adesso, emailSpedite)
    } catch (error) {
      logger.error('Coda del salone non aggiornata', { salonId, error })
    }
  }
  return { saloni, inviate }
}
