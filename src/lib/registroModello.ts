import type { Appointment, AppointmentStatus, DogSize, Temperament } from '../types/models'
import { APP_VERSION } from './appVersion'
import { sumDuration } from './appointments'
import { buildManifest, type GroomlyDati } from './backupBundle'
import { appointmentAmount, classify } from './earnings'
import { SEX_LABEL, SIZE_LABEL, TEMPERAMENT_LABEL } from './dogList'
import { romeIso } from './romeTime'

const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']
const STATI = new Set<AppointmentStatus>(['programmato', 'completato', 'disdetto', 'non_venuto'])

export type RigaCane = {
  codice: string
  cane: string
  razza: string
  taglia: string
  sesso: string
  anno: number | null
  carattere: string
  padrone: string
  telefono: string
  appuntamenti: number
  primo: Date | null
  ultimo: Date | null
  prossimo: Date | null
  ultimoServizio: string
  ultimoPrezzo: number | null
  totaleSpeso: number
  tempoMedio: number | null
  note: string
  foto: number
  stato: string
  percorso: string
}

export type RigaVisita = {
  data: Date | null
  ora: string
  codice: string
  cane: string
  razza: string
  padrone: string
  telefono: string
  servizio: string
  prezzo: number
  durata: number
  stato: string
  note: string
  foto: number
  percorso: string
}

export type RigaCliente = {
  padrone: string
  telefono: string
  cani: string
  appuntamenti: number
  totaleSpeso: number
  ultimo: Date | null
}

export type RigaMese = { mese: string; anno: number; appuntamenti: number; totale: number; media: number | null }
export type RigaAnno = { etichetta: string; appuntamenti: number; totale: number; media: number | null }
export type RigaServizio = {
  nome: string
  tipo: string
  prezzoPiccola: number | null
  prezzoMedia: number | null
  prezzoGrande: number | null
  durataPiccola: number | null
  durataMedia: number | null
  durataGrande: number | null
  attivo: string
}
export type RigaRazza = { razza: string; taglia: string; voce: string; tipo: string; prezzo: number | null }

export type RegistroModello = {
  salone: string
  creatoIl: string
  versione: string
  conteggi: { cani: number; clienti: number; appuntamenti: number; foto: number; fileListino: number }
  cani: RigaCane[]
  visite: RigaVisita[]
  clienti: RigaCliente[]
  mesi: RigaMese[]
  anni: RigaAnno[]
  servizi: RigaServizio[]
  razze: RigaRazza[]
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function extraNoteLines(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const lines: string[] = []
  for (const item of value) {
    const row = record(item)
    if (!row) continue
    const line = text(row.text)
    if (line) lines.push(line)
  }
  return lines
}

function romeCampi(date: Date): { year: number; month: number; day: number; hour: string; minute: string } {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(romeIso(date))
  if (!match) return { year: 1970, month: 1, day: 1, hour: '00', minute: '00' }
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]), hour: match[4], minute: match[5] }
}

function giornoExcel(date: Date): Date {
  const campi = romeCampi(date)
  // exceljs scrive il seriale da getTime(), quindi la mezzanotte UTC resta il giorno di Roma in ogni fuso.
  return new Date(Date.UTC(campi.year, campi.month - 1, campi.day))
}

function iso(value: unknown): Date | null {
  if (typeof value !== 'string') return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function chiaveCliente(id: string, dog: Record<string, unknown>): string {
  const contacts = Array.isArray(dog.contacts) ? dog.contacts.flatMap((item) => {
    const row = record(item)
    return row ? [row] : []
  }) : []
  const primary = contacts.find((item) => item.isPrimary === true) ?? contacts[0]
  const contact = record(dog.contact)
  const phone = typeof primary?.phone === 'string' ? primary.phone : typeof contact?.phone === 'string' ? contact.phone : ''
  const name = typeof primary?.name === 'string' ? primary.name : typeof contact?.name === 'string' ? contact.name : ''
  const digits = phone.replace(/\D/g, '')
  const trimmed = name.trim().toLowerCase()
  return digits ? `tel:${digits}` : trimmed ? `nome:${trimmed}` : `id:${typeof dog.id === 'string' ? dog.id : id}`
}

function padroneDi(dog: Record<string, unknown>): { name: string; phone: string } {
  const contacts = Array.isArray(dog.contacts) ? dog.contacts.flatMap((item) => {
    const row = record(item)
    return row ? [row] : []
  }) : []
  const primary = contacts.find((item) => item.isPrimary) ?? contacts[0]
  const contact = record(dog.contact)
  const name = text(primary?.name) || text(contact?.name)
  const phone = typeof primary?.phone === 'string' ? primary.phone : typeof contact?.phone === 'string' ? contact.phone : ''
  return { name, phone }
}

function percorsoDi(files: GroomlyDati['files'], ref: unknown): string {
  if (typeof ref !== 'string' || !ref.startsWith('file:')) return ''
  return files[ref.slice(5)]?.percorsoBackup ?? ''
}

function serviziDi(value: unknown): Appointment['services'] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    const row = record(item)
    if (!row || typeof row.serviceId !== 'string') return []
    return [{
      serviceId: row.serviceId,
      name: text(row.name),
      durationMin: typeof row.durationMin === 'number' ? row.durationMin : 0,
      price: typeof row.price === 'number' ? row.price : 0,
    }]
  })
}

function visitaDa(id: string, raw: Record<string, unknown>, files: GroomlyDati['files']): { visit: Appointment; percorso: string } | null {
  if (raw.kind === 'personale') return null
  const start = iso(raw.start)
  if (!start || typeof raw.status !== 'string' || !STATI.has(raw.status as AppointmentStatus)) return null
  const photos = Array.isArray(raw.photos) ? raw.photos.flatMap((item) => {
    const row = record(item)
    if (!row || typeof row.photo !== 'string') return []
    const kind = row.kind === 'prima' || row.kind === 'dopo' || row.kind === 'altro' ? row.kind : 'altro'
    return [{ id: text(row.id) || id, photo: row.photo, kind }]
  }) : []
  const visit = {
    id,
    dogId: typeof raw.dogId === 'string' ? raw.dogId : '',
    start,
    services: serviziDi(raw.services),
    status: raw.status as AppointmentStatus,
    createdAt: start,
    updatedAt: start,
    kind: 'pelosetto',
    photos,
  } as Appointment
  if (typeof raw.total === 'number') visit.total = raw.total
  if (typeof raw.actualDurationMin === 'number') visit.actualDurationMin = raw.actualDurationMin
  if (typeof raw.adjustmentNote === 'string') visit.adjustmentNote = raw.adjustmentNote
  if (raw.cancelReason === 'cliente' || raw.cancelReason === 'salone' || raw.cancelReason === 'deceduto') visit.cancelReason = raw.cancelReason
  const percorso = photos.map((item) => percorsoDi(files, item.photo)).find((item) => item) ?? ''
  return { visit, percorso }
}

function ordineCodice(code: string, id: string): string {
  const match = /^C(\d+)$/.exec(code)
  return `${(match ? match[1] : '99999999').padStart(8, '0')}\u0000${id}`
}

function mediaEuro(totale: number, count: number): number | null {
  if (count === 0) return null
  return Math.round((totale / count) * 100) / 100
}

function numero(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function tripla(value: unknown): { piccola: number | null; media: number | null; grande: number | null } {
  const row = record(value)
  return {
    piccola: numero(row?.piccola),
    media: numero(row?.media),
    grande: numero(row?.grande),
  }
}

export function costruisciRegistro(dati: GroomlyDati, now: Date): RegistroModello {
  const files = dati.files
  const deleted = new Set(dati.deletedDogs.ids)
  const codici = dati.codiciCane.byId
  const parsed = Object.entries(dati.appointments).flatMap(([id, raw]) => {
    const row = record(raw)
    const visit = row ? visitaDa(id, row, files) : null
    return visit ? [visit] : []
  })
  const visite = parsed.map((item) => item.visit).sort((a, b) => b.start.getTime() - a.start.getTime() || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  const perCane = new Map<string, Appointment[]>()
  for (const visit of visite) {
    const list = perCane.get(visit.dogId) ?? []
    list.push(visit)
    perCane.set(visit.dogId, list)
  }
  const cani = Object.entries(dati.dogs).flatMap(([id, raw]) => {
    const dog = record(raw)
    if (!dog) return []
    const code = codici[id] ?? ''
    const owner = padroneDi(dog)
    const own = perCane.get(id) ?? []
    const done = own.filter((item) => item.status === 'completato').sort((a, b) => a.start.getTime() - b.start.getTime())
    const next = own.filter((item) => item.status === 'programmato' && item.start.getTime() >= now.getTime()).sort((a, b) => a.start.getTime() - b.start.getTime())[0]
    const last = done[done.length - 1]
    const minutes = done.flatMap((item) => typeof item.actualDurationMin === 'number' ? [item.actualDurationMin] : [])
    const gallery = Array.isArray(dog.gallery) ? dog.gallery.length : 0
    const photo = text(dog.photo)
    const size = dog.size === 'piccola' || dog.size === 'media' || dog.size === 'grande' ? SIZE_LABEL[dog.size as DogSize] : ''
    const sex = dog.sex === 'M' || dog.sex === 'F' ? SEX_LABEL[dog.sex] : ''
    const temperament = dog.temperament === 'bravo' || dog.temperament === 'agitato' || dog.temperament === 'mordace' ? TEMPERAMENT_LABEL[dog.temperament as Temperament] : ''
    const note = [text(dog.criticalNote), text(dog.notes), ...extraNoteLines(dog.extraNotes)].filter(Boolean).join('\n')
    const percorso = percorsoDi(files, dog.photo) || (Array.isArray(dog.gallery) ? dog.gallery.map((item) => percorsoDi(files, record(item)?.photo)).find((item) => item) ?? '' : '')
    const row: RigaCane = {
      codice: code,
      cane: text(dog.name),
      razza: text(dog.breed),
      taglia: size,
      sesso: sex,
      anno: typeof dog.birthYear === 'number' ? dog.birthYear : null,
      carattere: temperament,
      padrone: owner.name,
      telefono: owner.phone,
      appuntamenti: done.length,
      primo: done[0] ? giornoExcel(done[0].start) : null,
      ultimo: last ? giornoExcel(last.start) : null,
      prossimo: next ? giornoExcel(next.start) : null,
      ultimoServizio: last ? last.services.map((item) => item.name).filter(Boolean).join(' e ') : '',
      ultimoPrezzo: last ? appointmentAmount(last) : null,
      totaleSpeso: done.reduce((sum, item) => sum + appointmentAmount(item), 0),
      tempoMedio: minutes.length ? Math.round((minutes.reduce((sum, item) => sum + item, 0) / minutes.length) * 10) / 10 : null,
      note,
      foto: (photo ? 1 : 0) + gallery + own.reduce((sum, item) => sum + (item.photos?.length ?? 0), 0),
      stato: deleted.has(id) ? 'Nascosto' : dog.status === 'deceduto' ? 'Deceduto' : dog.status === 'non_in_cura' ? 'Non più in cura' : 'Attivo',
      percorso,
    }
    return [{ id, chiave: chiaveCliente(id, dog), row }]
  }).sort((a, b) => ordineCodice(a.row.codice, a.id) < ordineCodice(b.row.codice, b.id) ? -1 : 1)

  const byId = new Map(cani.map((item) => [item.id, item.row]))
  const righeVisita: RigaVisita[] = parsed
    .sort((a, b) => b.visit.start.getTime() - a.visit.start.getTime() || (a.visit.id < b.visit.id ? -1 : 1))
    .map(({ visit, percorso }) => {
      const dog = byId.get(visit.dogId)
      const campi = romeCampi(visit.start)
      return {
        data: giornoExcel(visit.start),
        ora: `${campi.hour}:${campi.minute}`,
        codice: dog?.codice ?? '',
        cane: dog?.cane ?? '',
        razza: dog?.razza ?? '',
        padrone: dog?.padrone ?? '',
        telefono: dog?.telefono ?? '',
        servizio: visit.services.map((item) => item.name).filter(Boolean).join(' e '),
        prezzo: appointmentAmount(visit),
        durata: typeof visit.actualDurationMin === 'number' ? visit.actualDurationMin : sumDuration(visit.services),
        stato: visit.status === 'completato' ? 'Completato' : visit.status === 'disdetto' ? 'Disdetto' : visit.status === 'non_venuto' ? 'Non venuto' : 'Programmato',
        note: visit.adjustmentNote ?? '',
        foto: visit.photos?.length ?? 0,
        percorso,
      }
    })

  const groups = new Map<string, typeof cani>()
  for (const item of cani) {
    const list = groups.get(item.chiave) ?? []
    list.push(item)
    groups.set(item.chiave, list)
  }
  const clienti = [...groups.values()].map((group) => {
    const first = group[0].row
    const ids = new Set(group.map((item) => item.id))
    const done = visite.filter((item) => ids.has(item.dogId) && item.status === 'completato').sort((a, b) => a.start.getTime() - b.start.getTime())
    const last = done[done.length - 1]
    return {
      padrone: first.padrone,
      telefono: first.telefono,
      cani: group.map((item) => `${item.row.codice} ${item.row.cane}`.trim()).join(', '),
      appuntamenti: done.length,
      totaleSpeso: done.reduce((sum, item) => sum + appointmentAmount(item), 0),
      ultimo: last ? giornoExcel(last.start) : null,
    }
  }).sort((a, b) => (a.padrone < b.padrone ? -1 : a.padrone > b.padrone ? 1 : a.telefono < b.telefono ? -1 : 1))

  const incassate = visite.filter((item) => classify(item, now) === 'incassato')
  const mesi: RigaMese[] = []
  const anni: RigaAnno[] = []
  if (incassate.length > 0) {
    const first = romeCampi(incassate[incassate.length - 1].start)
    const end = romeCampi(now)
    const buckets = new Map<string, Appointment[]>()
    for (const item of incassate) {
      const campi = romeCampi(item.start)
      const key = `${campi.year}-${campi.month}`
      buckets.set(key, [...(buckets.get(key) ?? []), item])
    }
    let year = 0
    let yearCount = 0
    let yearTotal = 0
    for (let cursor = first.year * 12 + first.month - 1; cursor <= end.year * 12 + end.month - 1; cursor += 1) {
      const y = Math.floor(cursor / 12)
      const m = cursor % 12
      if (year !== 0 && y !== year) {
        anni.push({ etichetta: `Totale ${year}`, appuntamenti: yearCount, totale: yearTotal, media: mediaEuro(yearTotal, yearCount) })
        yearCount = 0
        yearTotal = 0
      }
      year = y
      const list = buckets.get(`${y}-${m + 1}`) ?? []
      const totale = list.reduce((sum, item) => sum + appointmentAmount(item), 0)
      yearCount += list.length
      yearTotal += totale
      mesi.push({ mese: `${MESI[m]} ${y}`, anno: y, appuntamenti: list.length, totale, media: mediaEuro(totale, list.length) })
    }
    if (year !== 0) anni.push({ etichetta: `Totale ${year}`, appuntamenti: yearCount, totale: yearTotal, media: mediaEuro(yearTotal, yearCount) })
  }

  const servizi = Object.values(dati.services).flatMap((raw) => {
    const row = record(raw)
    if (!row) return []
    const price = tripla(row.price)
    const duration = tripla(row.durationMin)
    return [{
      nome: text(row.name),
      tipo: row.kind === 'extra' ? 'Extra' : 'Principale',
      prezzoPiccola: price.piccola,
      prezzoMedia: price.media,
      prezzoGrande: price.grande,
      durataPiccola: duration.piccola,
      durataMedia: duration.media,
      durataGrande: duration.grande,
      attivo: row.active === true ? 'sì' : 'no',
      order: typeof row.order === 'number' ? row.order : 0,
    }]
  }).sort((a, b) => a.order - b.order || (a.nome < b.nome ? -1 : 1)).map((row) => ({
    nome: row.nome,
    tipo: row.tipo,
    prezzoPiccola: row.prezzoPiccola,
    prezzoMedia: row.prezzoMedia,
    prezzoGrande: row.prezzoGrande,
    durataPiccola: row.durataPiccola,
    durataMedia: row.durataMedia,
    durataGrande: row.durataGrande,
    attivo: row.attivo,
  }))

  const settings = record(dati.settings)
  const sheet = record(settings?.priceSheet)
  const breeds = Array.isArray(sheet?.razze) ? sheet.razze : []
  const razze = breeds.flatMap((raw) => {
    const breed = record(raw)
    if (!breed) return []
    const taglia = breed.taglia === 'piccola' || breed.taglia === 'media' || breed.taglia === 'grande' ? SIZE_LABEL[breed.taglia] : text(breed.taglia)
    const voci = Array.isArray(breed.voci) ? breed.voci : []
    return voci.flatMap((item) => {
      const voce = record(item)
      if (!voce) return []
      const tipo = voce.tipo === 'da' ? 'Da' : voce.tipo === 'fisso' ? 'Fisso' : voce.tipo === 'valutazione' ? 'Valutazione' : text(voce.tipo)
      return [{ razza: text(breed.nome), taglia, voce: text(voce.nome), tipo, prezzo: tipo === 'Valutazione' ? null : numero(voce.prezzo) }]
    })
  })

  const manifest = buildManifest(dati, { now, salonId: '', checksum: '', includiByte: false })
  return {
    salone: manifest.salone.nome || 'Groomly',
    creatoIl: romeIso(now),
    versione: APP_VERSION,
    conteggi: {
      cani: manifest.conteggi.cani,
      clienti: manifest.conteggi.clienti,
      appuntamenti: manifest.conteggi.appuntamenti,
      foto: manifest.conteggi.foto,
      fileListino: manifest.conteggi.fileListino,
    },
    cani: cani.map((item) => item.row),
    visite: righeVisita,
    clienti,
    mesi,
    anni,
    servizi,
    razze,
  }
}
