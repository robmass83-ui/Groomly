import JSZip from 'jszip'
import type { CodiciCaneDoc } from './codiceCane'
import { sha256Hex } from './backupBundle'
import { readRestoreBundle, type BackupBundle } from './backupDoc'
import { FILE_MAX_BYTES } from './fileBytes'
import { readTombstone, tombstoneRejectsDog } from './tombstone'
import { frase } from '../i18n/frase'


const LIMITE_FILE = 200
const LIMITE_BYTE = 80 * 1024 * 1024
const ID_OK = /^[A-Za-z0-9_-]{1,128}$/

export type FileRipristino = {
  id: string
  kind: 'foto' | 'file'
  owner: string
  name: string
  mime: string
  byteSize: number
  createdAt: number
  createdBy: string
  bytes: Uint8Array
  w?: number
  h?: number
}

/** Il salone da cui viene la copia, scritto nel manifest. */
export type SaloneCopia = { id: string; nome: string }

export type EsitoRipristino =
  | { esito: 'vecchio'; bundle: BackupBundle }
  | { esito: 'solo-dati'; bundle: BackupBundle; codici: CodiciCaneDoc; salone?: SaloneCopia }
  | { esito: 'completo'; bundle: BackupBundle; codici: CodiciCaneDoc; file: FileRipristino[]; saltati: number; salone?: SaloneCopia }
  | { esito: 'rifiutato'; messaggio: string }

type FileInCorso = Omit<FileRipristino, 'bytes'> & { percorso: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function rifiuto(messaggio: string): EsitoRipristino {
  return { esito: 'rifiutato', messaggio }
}

function percorsoOk(path: string): boolean {
  if (!path || path.includes('\\') || path.includes('\0') || path.startsWith('/') || path.endsWith('/') || path.includes('//')) return false
  return path.split('/').every((part) => part.length > 0 && part !== '.' && part !== '..')
}

function leggiVoce(id: string, value: unknown): { esito: 'mancante' } | { esito: 'ok'; file: FileInCorso } | null {
  if (!ID_OK.test(id) || !isRecord(value)) return null
  if ('id' in value && value.id !== id) return null
  if (value.esito === 'mancante') return { esito: 'mancante' }
  if (value.esito !== 'ok') return null
  const percorso = value.percorsoBackup
  if (typeof percorso !== 'string' || !percorsoOk(percorso)) return null
  if (value.kind !== 'foto' && value.kind !== 'file') return null
  if (typeof value.mime !== 'string' || value.mime.length === 0) return null
  if (typeof value.owner !== 'string' || typeof value.name !== 'string' || typeof value.createdBy !== 'string') return null
  if (value.kind === 'foto' && !value.mime.startsWith('image/')) return null
  const byteSize = value.byteSize
  if (typeof byteSize !== 'number' || !Number.isInteger(byteSize) || byteSize < 0 || byteSize > FILE_MAX_BYTES) return null
  if (typeof value.createdAt !== 'string' || Number.isNaN(Date.parse(value.createdAt))) return null
  const file: FileInCorso = {
    id,
    kind: value.kind,
    owner: value.owner,
    name: value.name,
    mime: value.mime,
    byteSize,
    createdAt: Date.parse(value.createdAt),
    createdBy: value.createdBy,
    percorso,
  }
  if (typeof value.w === 'number' && Number.isFinite(value.w)) file.w = value.w
  if (typeof value.h === 'number' && Number.isFinite(value.h)) file.h = value.h
  return { esito: 'ok', file }
}

// Una foto che non torna non deve far perdere clienti e visite: si salta, si conta e i dati si ripristinano.
// I limiti restano per la memoria del telefono: oltre, le foto si saltano, non la copia.
async function leggiCompleto(
  zip: JSZip,
  parsed: Record<string, unknown>,
  pronto: { bundle: BackupBundle; codici: CodiciCaneDoc },
  salone: SaloneCopia | undefined,
): Promise<EsitoRipristino> {
  if (!isRecord(parsed.files)) return rifiuto(frase('bakFileNonValido'))
  let saltati = 0
  const pronti: FileInCorso[] = []
  const percorsi = new Set<string>()
  let peso = 0
  for (const [id, value] of Object.entries(parsed.files)) {
    const voce = leggiVoce(id, value)
    if (voce?.esito === 'mancante') continue
    if (!voce || percorsi.has(voce.file.percorso) || pronti.length >= LIMITE_FILE || peso + voce.file.byteSize > LIMITE_BYTE) {
      saltati += 1
      continue
    }
    percorsi.add(voce.file.percorso)
    peso += voce.file.byteSize
    pronti.push(voce.file)
  }
  const file: FileRipristino[] = []
  for (const item of pronti) {
    const letti = await zip.file(item.percorso)?.async('uint8array').catch(() => null)
    if (!letti || letti.length !== item.byteSize) {
      saltati += 1
      continue
    }
    const { percorso, ...rest } = item
    void percorso
    file.push({ ...rest, bytes: new Uint8Array(letti) })
  }
  return { esito: 'completo', bundle: pronto.bundle, codici: pronto.codici, file, saltati, ...(salone ? { salone } : {}) }
}

function saloneDi(manifest: Record<string, unknown>): SaloneCopia | undefined {
  const salone = manifest.salone
  if (!isRecord(salone) || typeof salone.id !== 'string' || salone.id === '') return undefined
  return { id: salone.id, nome: typeof salone.nome === 'string' ? salone.nome : '' }
}

function leggiCodici(value: unknown): CodiciCaneDoc | null {
  if (!isRecord(value)) return null
  const { next, cartella, byId } = value
  if (typeof next !== 'number' || !Number.isInteger(next) || next < 1) return null
  if (cartella !== 'cani' && cartella !== 'animali') return null
  if (!isRecord(byId)) return null
  const codes: Record<string, string> = {}
  for (const [id, code] of Object.entries(byId)) {
    if (typeof code !== 'string' || code.length === 0) return null
    codes[id] = code
  }
  return { next, cartella, byId: codes }
}

// Il ripristino non riporta i cani cancellati né le visite segnate. Le visite rimaste di un cane
// cancellato restano: il ripristino non deve toglierle dal cloud.
function senzaCancellati(dogs: Record<string, unknown>, appointments: Record<string, unknown>, deleted: unknown): { dogs: Record<string, unknown>; appointments: Record<string, unknown> } {
  const stone = readTombstone(deleted)
  const keptDogs = Object.fromEntries(Object.entries(dogs).filter(([id]) => !tombstoneRejectsDog(stone, id)))
  const keptAppointments = Object.fromEntries(Object.entries(appointments).filter(([id]) => !stone.appointmentIds.includes(id)))
  return { dogs: keptDogs, appointments: keptAppointments }
}

function bundleDati(value: Record<string, unknown>, codici: CodiciCaneDoc): { bundle: BackupBundle; codici: CodiciCaneDoc } | null {
  if (value.versioneFormato !== 1) return null
  if (!isRecord(value.dogs) || !isRecord(value.appointments) || !isRecord(value.services) || !isRecord(value.settings) || !isRecord(value.closures)) return null
  const vivi = senzaCancellati(value.dogs, value.appointments, value.deletedDogs)
  return {
    bundle: {
      dogs: vivi.dogs,
      appointments: vivi.appointments,
      services: value.services,
      settings: value.settings,
      closures: value.closures,
      ...(isRecord(value.prodotti) ? { prodotti: value.prodotti } : {}),
    },
    codici,
  }
}

async function leggiZip(bytes: Uint8Array): Promise<EsitoRipristino> {
  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(bytes)
  } catch {
    return rifiuto(frase('bakFileNonValido'))
  }
  const manifestFile = zip.file('dati/manifest.json')
  const datiFile = zip.file('dati/groomly-dati.json')
  if (!manifestFile || !datiFile) return rifiuto(frase('bakFileNonValido'))
  const manifestText = await manifestFile.async('string')
  const json = await datiFile.async('string')
  let manifest: unknown
  try {
    manifest = JSON.parse(manifestText) as unknown
  } catch {
    return rifiuto(frase('bakFileNonValido'))
  }
  if (!isRecord(manifest) || manifest.formato !== 'groomly-backup' || manifest.versioneFormato !== 1) return rifiuto(frase('bakFileNonValido'))
  const checksums = manifest.checksum
  const checksum = isRecord(checksums) ? checksums['groomly-dati.json'] : undefined
  if (typeof checksum !== 'string' || await sha256Hex(json) !== checksum) return rifiuto(frase('bakFileNonValido'))
  let parsed: unknown
  try {
    parsed = JSON.parse(json) as unknown
  } catch {
    return rifiuto(frase('bakFileNonValido'))
  }
  if (!isRecord(parsed)) return rifiuto(frase('bakFileNonValido'))
  const codici = leggiCodici(parsed.codiciCane)
  const pronto = codici ? bundleDati(parsed, codici) : null
  if (!pronto) return rifiuto(frase('bakFileNonValido'))
  const salone = saloneDi(manifest)
  if (manifest.tipo === 'completo') return leggiCompleto(zip, parsed, pronto, salone)
  if (manifest.tipo !== 'solo-dati') return rifiuto(frase('bakFileNonValido'))
  return { esito: 'solo-dati', bundle: pronto.bundle, codici: pronto.codici, ...(salone ? { salone } : {}) }
}

function leggiJson(bytes: Uint8Array): EsitoRipristino {
  let parsed: unknown
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes)) as unknown
  } catch {
    return rifiuto(frase('bakFileNonValido'))
  }
  if (isRecord(parsed) && 'versioneFormato' in parsed) return rifiuto(frase('bakJsonInterno'))
  const bundle = readRestoreBundle(parsed)
  if (!bundle) return rifiuto(frase('bakFileNonValido'))
  return { esito: 'vecchio', bundle }
}

export async function leggiRipristino(bytes: Uint8Array): Promise<EsitoRipristino> {
  if (bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b) return leggiZip(bytes)
  return leggiJson(bytes)
}

export function impostazioniRipristino(dalFile: Record<string, unknown>, dalTelefono: Record<string, unknown>): Record<string, unknown> {
  const copy = { ...dalFile }
  if (isRecord(dalTelefono.backup)) copy.backup = dalTelefono.backup
  else delete copy.backup
  if (typeof dalTelefono.passwordHash === 'string') copy.passwordHash = dalTelefono.passwordHash
  else delete copy.passwordHash
  // La coda è stato del server, non una scelta: quella del file riporterebbe email già spedite o fermate.
  if (Array.isArray(dalTelefono.codaEmail)) copy.codaEmail = dalTelefono.codaEmail
  else delete copy.codaEmail
  return copy
}
