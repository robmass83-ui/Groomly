import JSZip from 'jszip'
import type { CodiciCaneDoc } from './codiceCane'
import { sha256Hex } from './backupBundle'
import { readRestoreBundle, type BackupBundle } from './backupDoc'

const FILE = 'File non valido'
const FOTO = 'Questo archivio ha le foto: il ripristino delle foto arriva dopo. Per i dati usa Backup ZIP.'
const INTERNO = 'Questo è il JSON interno. Ripristina lo ZIP di Backup ZIP.'

export type EsitoRipristino =
  | { esito: 'vecchio'; bundle: BackupBundle }
  | { esito: 'solo-dati'; bundle: BackupBundle; codici: CodiciCaneDoc }
  | { esito: 'rifiutato'; messaggio: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function rifiuto(messaggio: string): EsitoRipristino {
  return { esito: 'rifiutato', messaggio }
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

function bundleDati(value: Record<string, unknown>, codici: CodiciCaneDoc): { bundle: BackupBundle; codici: CodiciCaneDoc } | null {
  if (value.versioneFormato !== 1) return null
  if (!isRecord(value.dogs) || !isRecord(value.appointments) || !isRecord(value.services) || !isRecord(value.settings) || !isRecord(value.closures)) return null
  return {
    bundle: {
      dogs: value.dogs,
      appointments: value.appointments,
      services: value.services,
      settings: value.settings,
      closures: value.closures,
    },
    codici,
  }
}

async function leggiZip(bytes: Uint8Array): Promise<EsitoRipristino> {
  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(bytes)
  } catch {
    return rifiuto(FILE)
  }
  const manifestFile = zip.file('dati/manifest.json')
  const datiFile = zip.file('dati/groomly-dati.json')
  if (!manifestFile || !datiFile) return rifiuto(FILE)
  const manifestText = await manifestFile.async('string')
  const json = await datiFile.async('string')
  let manifest: unknown
  try {
    manifest = JSON.parse(manifestText) as unknown
  } catch {
    return rifiuto(FILE)
  }
  if (!isRecord(manifest) || manifest.formato !== 'groomly-backup' || manifest.versioneFormato !== 1) return rifiuto(FILE)
  const checksums = manifest.checksum
  const checksum = isRecord(checksums) ? checksums['groomly-dati.json'] : undefined
  if (typeof checksum !== 'string' || await sha256Hex(json) !== checksum) return rifiuto(FILE)
  let parsed: unknown
  try {
    parsed = JSON.parse(json) as unknown
  } catch {
    return rifiuto(FILE)
  }
  if (!isRecord(parsed)) return rifiuto(FILE)
  const codici = leggiCodici(parsed.codiciCane)
  const pronto = codici ? bundleDati(parsed, codici) : null
  if (!pronto) return rifiuto(FILE)
  if (manifest.tipo === 'completo') return rifiuto(FOTO)
  if (manifest.tipo !== 'solo-dati') return rifiuto(FILE)
  return { esito: 'solo-dati', bundle: pronto.bundle, codici: pronto.codici }
}

function leggiJson(bytes: Uint8Array): EsitoRipristino {
  let parsed: unknown
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes)) as unknown
  } catch {
    return rifiuto(FILE)
  }
  if (isRecord(parsed) && 'versioneFormato' in parsed) return rifiuto(INTERNO)
  const bundle = readRestoreBundle(parsed)
  if (!bundle) return rifiuto(FILE)
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
  return copy
}
