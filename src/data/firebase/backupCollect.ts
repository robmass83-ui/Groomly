import { AppError } from '../errors'
import {
  buildManifest,
  canonicalJson,
  cartellaCane,
  giornoAppuntamento,
  scegliPercorsi,
  settingsSenzaBackup,
  sha256Hex,
  type BackupFileMeta,
  type BackupManifest,
  type GroomlyDati,
  type RiferimentoFile,
} from '../../lib/backupBundle'
import { estensioneDaMime, ricomponiFile } from '../../lib/backupFile'
import { assegnaCodici, type CodiciCaneDoc } from '../../lib/codiceCane'
import { closureRangeOk, closureReasonOk, type Closure } from '../../lib/closures'
import { fileIdOf } from '../../lib/fileBytes'
import { appointmentFromDocMaybe, dogFromDoc, serviceFromDoc, settingsFromDoc, settingsToDoc } from '../../lib/firebaseMap'
import { appointmentKind } from '../../lib/personal'
import { nomeSicuro } from '../../lib/nomeSicuro'
import { readTombstone } from '../../lib/tombstone'
import type { Appointment, Dog } from '../../types/models'
import { closuresToLocalMap } from '../local/closures'
import { readSalonCollection, readSalonDoc, transactionSalon } from './client'
import { appointmentsToLocalMap, dogsToLocalMap, servicesToLocalMap } from './localSeed'
import { currentSalonId, salonRootPath } from './salonRoot'

export const LIMITE_LETTURE = 3

export type BackupSink = (meta: BackupFileMeta, bytes: Uint8Array, percorsoBackup: string) => Promise<void> | void

type Data = Record<string, unknown>
type Missing = GroomlyDati['fotoMancanti'][number]

const OFFLINE_MESSAGE = 'Serve la connessione per creare il backup'
const CLOSURE_DAY = /^\d{4}-\d{2}-\d{2}$/

function cmp(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

function isRecord(value: unknown): value is Data {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function instant(date: Date | undefined): string {
  return date && !Number.isNaN(date.getTime()) ? date.toISOString() : ''
}

function offline(): AppError {
  return new AppError(OFFLINE_MESSAGE, 'backup_offline')
}

function classify(error: unknown): AppError {
  if (error instanceof AppError) return error
  const code = isRecord(error) && typeof error.code === 'string' ? error.code : ''
  if (code.includes('unavailable') || code.includes('deadline-exceeded') || code.includes('network')) return offline()
  return new AppError('Salvataggio non riuscito', 'storage_write')
}

async function dalFirestore<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run()
  } catch (error) {
    throw classify(error)
  }
}

export async function mappaConLimite<T>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
  let next = 0
  let failed = false
  let firstError: unknown
  const lane = async () => {
    while (!failed) {
      const index = next
      next += 1
      if (index >= items.length) return
      try {
        await worker(items[index], index)
      } catch (error) {
        if (!failed) firstError = error
        failed = true
        return
      }
    }
  }
  const lanes = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, lane)
  await Promise.all(lanes)
  if (failed) throw firstError
}

function parseCodici(raw: Data | null): CodiciCaneDoc | null {
  if (!raw) return null
  const byId: Record<string, string> = {}
  if (isRecord(raw.byId)) {
    for (const [id, code] of Object.entries(raw.byId)) if (typeof code === 'string') byId[id] = code
  }
  return {
    next: typeof raw.next === 'number' && raw.next >= 1 ? raw.next : 1,
    cartella: raw.cartella === 'animali' ? 'animali' : 'cani',
    byId,
  }
}

function closureFromDoc(id: string, data: Data): Closure | null {
  const reason = typeof data.reason === 'string' ? data.reason.trim() : ''
  const startDay = text(data.startDay)
  const endDay = text(data.endDay)
  const createdAt = typeof data.createdAt === 'number' ? data.createdAt : Number.NaN
  const updatedAt = typeof data.updatedAt === 'number' ? data.updatedAt : Number.NaN
  const fieldsOk = closureReasonOk(reason) && CLOSURE_DAY.test(startDay) && CLOSURE_DAY.test(endDay) && closureRangeOk(startDay, endDay)
  if (!id || !fieldsOk) return null
  if (!Number.isFinite(createdAt) || !Number.isFinite(updatedAt)) return null
  return { id, reason, startDay, endDay, createdAt: new Date(createdAt), updatedAt: new Date(updatedAt) }
}

// Stesse chiavi di appointmentsBackupMap in client.ts, che resta privata.
function appointmentsMap(appointments: Array<Appointment | null>): Record<string, unknown> {
  const visits: Appointment[] = []
  const personal: Record<string, unknown> = {}
  for (const appointment of appointments) {
    if (!appointment) continue
    if (appointmentKind(appointment) !== 'personale') {
      visits.push(appointment)
      continue
    }
    const stored: Record<string, unknown> = {
      id: appointment.id,
      kind: 'personale',
      title: (appointment.title ?? '').trim(),
      start: appointment.start.toISOString(),
      createdAt: appointment.createdAt.toISOString(),
      updatedAt: appointment.updatedAt.toISOString(),
    }
    if (appointment.plannedEnd) stored.plannedEnd = appointment.plannedEnd.toISOString()
    personal[appointment.id] = stored
  }
  return { ...appointmentsToLocalMap(visits), ...personal }
}

function isoOf(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) return new Date(value).toISOString()
  if (typeof value === 'string' && !Number.isNaN(Date.parse(value))) return new Date(value).toISOString()
  if (isRecord(value) && typeof value.toDate === 'function') {
    const date = (value as { toDate(): Date }).toDate()
    if (!Number.isNaN(date.getTime())) return date.toISOString()
  }
  return new Date(0).toISOString()
}

function fileMeta(id: string, data: Data): BackupFileMeta {
  const mime = text(data.mime) || 'application/octet-stream'
  const kind = data.kind === 'foto' || data.kind === 'file' ? data.kind : mime.startsWith('image/') ? 'foto' : 'file'
  const chunkCount = typeof data.chunkCount === 'number' && Number.isInteger(data.chunkCount) && data.chunkCount > 0 ? data.chunkCount : 0
  const meta: BackupFileMeta = {
    id,
    kind,
    owner: text(data.owner),
    name: text(data.name),
    mime,
    byteSize: typeof data.byteSize === 'number' ? data.byteSize : 0,
    chunkCount,
    createdAt: isoOf(data.createdAt),
    createdBy: text(data.createdBy),
    estensione: estensioneDaMime(mime),
    percorsoBackup: '',
    esito: 'ok',
  }
  if (typeof data.w === 'number') meta.w = data.w
  if (typeof data.h === 'number') meta.h = data.h
  return meta
}

type BytesLike = { toUint8Array(): Uint8Array }

/** `null` se il campo manca, `'illeggibile'` se non si converte in byte. */
function convertiPezzo(snap: Data | null): Uint8Array | null | 'illeggibile' {
  if (!snap) return null
  const value = snap.dati
  if (value === undefined || value === null) return null
  try {
    if (typeof (value as BytesLike).toUint8Array !== 'function') return 'illeggibile'
    return (value as BytesLike).toUint8Array()
  } catch {
    return 'illeggibile'
  }
}

async function leggiBytes(meta: BackupFileMeta, rawSize: number | undefined) {
  const parts: Array<Uint8Array | null> = []
  if (meta.chunkCount === 0) {
    const piece = convertiPezzo(await dalFirestore(() => readSalonDoc('files', meta.id, 'full', 'data')))
    if (piece === 'illeggibile') return { ok: false as const, motivo: 'illeggibile' as const, byteSize: rawSize }
    parts.push(piece)
  } else {
    for (let index = 0; index < meta.chunkCount; index += 1) {
      const piece = convertiPezzo(await dalFirestore(() => readSalonDoc('files', meta.id, 'chunks', String(index))))
      if (piece === 'illeggibile') return { ok: false as const, motivo: 'illeggibile' as const, byteSize: rawSize }
      parts.push(piece)
      if (piece === null) break
    }
  }
  return ricomponiFile({ chunkCount: meta.chunkCount, byteSize: rawSize, parts })
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function fileRefsOf(input: {
  dogs: Dog[]
  appointments: Appointment[]
  settings: Data
  files: Map<string, BackupFileMeta>
  codici: CodiciCaneDoc
}): RiferimentoFile[] {
  const { files, codici } = input
  const refs: RiferimentoFile[] = []
  const estensione = (id: string) => files.get(id)?.estensione ?? ''
  const push = (value: string | undefined, ruolo: RiferimentoFile['ruolo'], base: string, ordine: string) => {
    const id = fileIdOf(value)
    if (!id || !files.has(id)) return
    refs.push({ fileId: id, ruolo, path: `${base}${estensione(id)}`, ordine })
  }

  const dogById = new Map(input.dogs.map((dog) => [dog.id, dog]))
  const visitsByDog = new Map<string, Appointment[]>()
  for (const appointment of input.appointments) {
    if (appointmentKind(appointment) === 'personale' || !dogById.has(appointment.dogId)) continue
    visitsByDog.set(appointment.dogId, [...(visitsByDog.get(appointment.dogId) ?? []), appointment])
  }

  for (const dog of [...input.dogs].sort((a, b) => cmp(a.id, b.id))) {
    const code = codici.byId[dog.id]
    if (!code) continue
    const folder = `${codici.cartella}/${cartellaCane(code, dog)}`
    push(dog.photo, 'profilo', `${folder}/profilo`, 'profilo')

    const gallery = [...dog.gallery]
      .map((item) => ({ item, ordine: `${instant(item.takenAt)}\u0000${item.id}` }))
      .filter(({ item }) => {
        const id = fileIdOf(item.photo)
        return !!id && files.has(id)
      })
      .sort((a, b) => cmp(a.ordine, b.ordine))
    gallery.forEach(({ item, ordine }, index) => {
      push(item.photo, 'galleria', `${folder}/altre foto/foto-${pad2(index + 1)}`, ordine)
    })

    const visits = (visitsByDog.get(dog.id) ?? [])
      .map((appointment) => ({ appointment, ordine: `${instant(appointment.start)}\u0000${appointment.id}` }))
      .sort((a, b) => cmp(a.ordine, b.ordine))
    const taken = new Map<string, number>()
    for (const { appointment, ordine } of visits) {
      const names = appointment.services.map((line) => line.name.trim()).filter(Boolean)
      const service = names.length > 0 ? nomeSicuro(names.join(' e ')) : 'visita'
      const name = `${giornoAppuntamento(appointment.start)} - ${service}`
      const count = (taken.get(name) ?? 0) + 1
      taken.set(name, count)
      const subfolder = `${folder}/${count > 1 ? `${name} (${count})` : name}`
      const counters: Record<string, number> = { prima: 0, dopo: 0, altro: 0 }
      const photos = [...(appointment.photos ?? [])].sort((a, b) => cmp(a.id, b.id) || cmp(a.photo, b.photo))
      for (const photo of photos) {
        const id = fileIdOf(photo.photo)
        if (!id || !files.has(id)) continue
        counters[photo.kind] += 1
        push(photo.photo, 'appuntamento', `${subfolder}/${photo.kind}-${pad2(counters[photo.kind])}`, ordine)
      }
    }
  }

  const sheet = isRecord(input.settings.priceSheet) ? input.settings.priceSheet : null
  const heading = sheet && isRecord(sheet.intestazione) ? sheet.intestazione : null
  push(heading ? text(heading.logo) : undefined, 'logo', 'listino/logo', 'logo')

  const priceItems = [
    ...(isRecord(input.settings.priceList) ? [input.settings.priceList] : []),
    ...(Array.isArray(input.settings.priceListHistory) ? input.settings.priceListHistory.filter(isRecord) : []),
  ]
  const priceById = new Map<string, string>()
  for (const item of priceItems) {
    const id = fileIdOf(text(item.dataUrl))
    if (id && files.has(id) && !priceById.has(id)) priceById.set(id, text(item.fileName).trim())
  }
  const used = new Set<string>()
  for (const id of [...priceById.keys()].sort(cmp)) {
    const raw = priceById.get(id) ?? ''
    const name = nomeSicuro(raw || id)
    const ext = estensione(id)
    let candidate = `${name}${ext}`
    for (let n = 2; used.has(candidate.toLowerCase()); n += 1) candidate = `${name} (${n})${ext}`
    used.add(candidate.toLowerCase())
    refs.push({ fileId: id, ruolo: 'listino', path: `listino/file/${candidate}`, ordine: 'listino' })
  }

  const cited = new Set(refs.map((ref) => ref.fileId))
  for (const id of [...files.keys()].sort(cmp)) {
    if (!cited.has(id)) refs.push({ fileId: id, ruolo: 'sciolto', path: `file-sciolti/${id}${estensione(id)}`, ordine: 'sciolto' })
  }
  return refs
}

export async function raccogliBackup(
  now: Date,
  opzioni: { includiByte?: boolean; onFile?: BackupSink } = {},
): Promise<{ dati: GroomlyDati; manifest: BackupManifest; json: string; checksum: string }> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw offline()
  salonRootPath()
  const salonId = currentSalonId() ?? ''
  const includiByte = opzioni.includiByte !== false

  const [dogDocs, appointmentDocs, serviceDocs, closureDocs, fileDocs, settingsDoc, tombstoneDoc, codiciDoc] = await dalFirestore(() => Promise.all([
    readSalonCollection('dogs'),
    readSalonCollection('appointments'),
    readSalonCollection('services'),
    readSalonCollection('closures'),
    readSalonCollection('files'),
    readSalonDoc('settings', 'main'),
    readSalonDoc('meta', 'deleted-dogs'),
    readSalonDoc('meta', 'codici-cani'),
  ]))

  const dogs = dogDocs.map((item) => dogFromDoc(item.id, item.data))
  const parsedAppointments = appointmentDocs.map((item) => appointmentFromDocMaybe(item.id, item.data))
  const appointments = parsedAppointments.filter((item): item is Appointment => item !== null)
  const settingsStored = settingsDoc ? settingsToDoc(settingsFromDoc(settingsDoc)) : {}
  const stone = readTombstone(tombstoneDoc)

  const cani = dogs.map((dog) => ({ id: dog.id, createdAt: dog.createdAt.getTime(), species: dog.species }))
  let { doc: codici, changed } = assegnaCodici(parseCodici(codiciDoc), cani)
  if (changed) {
    codici = await dalFirestore(() => transactionSalon(async (tx) => {
      const current = parseCodici(await tx.get('meta', 'codici-cani'))
      const result = assegnaCodici(current, cani)
      if (result.changed) tx.set('meta', 'codici-cani', { next: result.doc.next, cartella: result.doc.cartella, byId: result.doc.byId })
      return result.doc
    }))
    changed = false
  }

  const metas = new Map<string, BackupFileMeta>()
  const rawSizes = new Map<string, number | undefined>()
  for (const item of [...fileDocs].sort((a, b) => cmp(a.id, b.id))) {
    metas.set(item.id, fileMeta(item.id, item.data))
    rawSizes.set(item.id, typeof item.data.byteSize === 'number' ? item.data.byteSize : undefined)
  }
  const chosen = scegliPercorsi(fileRefsOf({ dogs, appointments, settings: settingsStored, files: metas, codici }))
  for (const [id, meta] of metas) {
    const path = chosen.get(id)
    if (!path) continue
    meta.percorsoBackup = path.percorsoBackup
    if (path.altriRiferimenti) meta.altriRiferimenti = path.altriRiferimenti
  }

  const fotoMancanti: Missing[] = []
  if (includiByte) {
    let coda: Promise<void> = Promise.resolve()
    let fallito = false
    const consegna = (meta: BackupFileMeta, bytes: Uint8Array): Promise<void> => {
      const sink = opzioni.onFile
      if (!sink) return Promise.resolve()
      const turno = coda.then(async () => {
        if (fallito) return
        try {
          await sink(meta, bytes, meta.percorsoBackup)
        } catch (error) {
          fallito = true
          throw error
        }
      })
      coda = turno.catch(() => undefined)
      return turno
    }
    await mappaConLimite([...metas.values()], LIMITE_LETTURE, async (meta) => {
      const rawSize = rawSizes.get(meta.id)
      const result = await leggiBytes(meta, rawSize)
      if (!result.ok) {
        meta.esito = 'mancante'
        const row: Missing = { id: meta.id, motivo: result.motivo }
        if (result.byteSize !== undefined) row.byteSize = result.byteSize
        if (result.lunghezza !== undefined) row.lunghezza = result.lunghezza
        fotoMancanti.push(row)
        return
      }
      if (rawSize === undefined) meta.byteSize = result.bytes.byteLength
      await consegna(meta, result.bytes)
    })
    fotoMancanti.sort((a, b) => cmp(a.id, b.id))
  }

  const closures = closureDocs.flatMap((item) => {
    const parsed = closureFromDoc(item.id, item.data)
    return parsed ? [parsed] : []
  })
  const files: Record<string, BackupFileMeta> = {}
  for (const [id, meta] of metas) files[id] = meta

  const dati: GroomlyDati = {
    versioneFormato: 1,
    dogs: dogsToLocalMap(dogs),
    appointments: appointmentsMap(parsedAppointments),
    services: servicesToLocalMap(serviceDocs.map((item) => serviceFromDoc(item.id, item.data))),
    settings: settingsSenzaBackup(settingsStored),
    closures: closuresToLocalMap(closures),
    files,
    deletedDogs: {
      ids: [...new Set(stone.ids)].sort(cmp),
      appointmentIds: [...new Set(stone.appointmentIds)].sort(cmp),
    },
    codiciCane: codici,
    fotoMancanti,
  }
  const json = canonicalJson(dati)
  const checksum = await sha256Hex(json)
  const manifest = buildManifest(dati, { now, salonId, checksum, includiByte })
  return { dati, manifest, json, checksum }
}
