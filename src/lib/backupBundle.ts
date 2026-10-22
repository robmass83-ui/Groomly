import { APP_VERSION } from './appVersion'
import type { CodiciCaneDoc } from './codiceCane'
import { nomeSicuro } from './nomeSicuro'
import { romeDay, romeIso } from './romeTime'

const RANGO = { appuntamento: 0, galleria: 1, profilo: 2, logo: 3, listino: 4, sciolto: 5 } as const

export type RiferimentoFile = {
  fileId: string
  ruolo: keyof typeof RANGO
  path: string
  /** Within a role: tie-break `${ISO instant}\u0000${id}`; code-unit compare; earlier instant, then smaller id. */
  ordine: string
}

export function scegliPercorsi(refs: readonly RiferimentoFile[]) {
  const grouped = new Map<string, RiferimentoFile[]>()
  for (const ref of refs) grouped.set(ref.fileId, [...(grouped.get(ref.fileId) ?? []), ref])
  const chosen = new Map<string, { percorsoBackup: string; altriRiferimenti?: string[] }>()
  for (const [fileId, list] of grouped) {
    const ordered = [...list].sort((a, b) => {
      const roleDiff = RANGO[a.ruolo] - RANGO[b.ruolo]
      if (roleDiff !== 0) return roleDiff
      if (a.ordine < b.ordine) return -1
      if (a.ordine > b.ordine) return 1
      return 0
    })
    const primary = ordered[0]?.path ?? ''
    const others = [...new Set(ordered.slice(1).map((item) => item.path).filter((path) => path !== primary))].sort()
    chosen.set(fileId, others.length > 0 ? { percorsoBackup: primary, altriRiferimenti: others } : { percorsoBackup: primary })
  }
  return chosen
}

export function giornoAppuntamento(start: Date): string {
  return romeDay(start)
}

export function cartellaCane(codice: string, dog: {
  name: string
  breed?: string
  contact?: { name?: string }
  contacts?: Array<{ name?: string; isPrimary?: boolean }>
}): string {
  const contacts = dog.contacts ?? []
  const padrone = (contacts.find((item) => item.isPrimary)?.name ?? contacts[0]?.name ?? dog.contact?.name ?? '').trim()
  let folder = `${codice} - ${nomeSicuro(dog.name)}`
  if ((dog.breed ?? '').trim()) folder += ` - ${nomeSicuro(dog.breed ?? '')}`
  if (padrone) folder += ` (${nomeSicuro(padrone)})`
  return folder
}

export function settingsSenzaBackup(settings: Record<string, unknown>): Record<string, unknown> {
  const copy = { ...settings }
  delete copy.backup
  delete copy.passwordHash
  return copy
}

export type BackupFileMeta = {
  id: string
  kind: 'foto' | 'file'
  owner: string
  name: string
  mime: string
  byteSize: number
  chunkCount: number
  w?: number
  h?: number
  createdAt: string
  createdBy: string
  estensione: string
  percorsoBackup: string
  altriRiferimenti?: string[]
  esito: 'ok' | 'mancante'
}

export type GroomlyDati = {
  versioneFormato: number
  dogs: Record<string, unknown>
  appointments: Record<string, unknown>
  services: Record<string, unknown>
  settings: Record<string, unknown>
  closures: Record<string, unknown>
  files: Record<string, BackupFileMeta>
  deletedDogs: { ids: string[]; appointmentIds: string[] }
  codiciCane: CodiciCaneDoc
  fotoMancanti: Array<{
    id: string
    motivo: 'assente' | 'chunk-assente' | 'dimensione' | 'illeggibile'
    byteSize?: number
    lunghezza?: number
  }>
}

export type BackupManifest = {
  formato: 'groomly-backup'
  versioneFormato: 1
  creatoIl: string
  app: { versione: string }
  salone: { id: string; nome: string }
  conteggi: {
    cani: number
    clienti: number
    appuntamenti: number
    foto: number
    fileListino: number
    fotoMancanti: number
  }
  tipo: 'completo' | 'solo-dati'
  fotoIncluse: boolean
  checksum: { 'groomly-dati.json': string }
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (!value || typeof value !== 'object') return value
  const sorted: Record<string, unknown> = {}
  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    sorted[key] = sortKeys((value as Record<string, unknown>)[key])
  }
  return sorted
}

export function canonicalJson(dati: GroomlyDati): string {
  return JSON.stringify({
    versioneFormato: dati.versioneFormato,
    dogs: sortKeys(dati.dogs),
    appointments: sortKeys(dati.appointments),
    services: sortKeys(dati.services),
    settings: sortKeys(dati.settings),
    closures: sortKeys(dati.closures),
    files: sortKeys(dati.files),
    deletedDogs: sortKeys(dati.deletedDogs),
    codiciCane: sortKeys(dati.codiciCane),
    fotoMancanti: sortKeys(dati.fotoMancanti),
  })
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

export function contaClienti(dogs: Record<string, unknown>): number {
  const keys = new Set<string>()
  for (const [id, raw] of Object.entries(dogs)) {
    const dog = asRecord(raw)
    if (!dog) continue
    const contacts = Array.isArray(dog.contacts) ? dog.contacts.flatMap((item) => {
      const row = asRecord(item)
      return row ? [row] : []
    }) : []
    const primary = contacts.find((item) => item.isPrimary === true) ?? contacts[0]
    const contact = asRecord(dog.contact)
    const phone = typeof primary?.phone === 'string' ? primary.phone : typeof contact?.phone === 'string' ? contact.phone : ''
    const name = typeof primary?.name === 'string' ? primary.name : typeof contact?.name === 'string' ? contact.name : ''
    const digits = phone.replace(/\D/g, '')
    const trimmed = name.trim().toLowerCase()
    keys.add(digits ? `tel:${digits}` : trimmed ? `nome:${trimmed}` : `id:${typeof dog.id === 'string' ? dog.id : id}`)
  }
  return keys.size
}

export function buildManifest(dati: GroomlyDati, input: { now: Date; salonId: string; checksum: string; includiByte?: boolean }): BackupManifest {
  const business = asRecord(dati.settings.business)
  const salonName = typeof business?.salonName === 'string' ? business.salonName.trim() : ''
  const ownerName = typeof business?.name === 'string' ? business.name.trim() : ''
  const bytes = input.includiByte !== false
  const files = Object.values(dati.files)
  return {
    formato: 'groomly-backup',
    versioneFormato: 1,
    creatoIl: romeIso(input.now),
    app: { versione: APP_VERSION },
    salone: { id: input.salonId, nome: salonName || ownerName },
    conteggi: {
      cani: Object.keys(dati.dogs).length,
      clienti: contaClienti(dati.dogs),
      appuntamenti: Object.keys(dati.appointments).length,
      foto: files.filter((file) => file.kind === 'foto' && file.esito === 'ok').length,
      fileListino: files.filter((file) => file.owner === 'listino' && file.esito === 'ok').length,
      fotoMancanti: dati.fotoMancanti.length,
    },
    tipo: bytes ? 'completo' : 'solo-dati',
    fotoIncluse: bytes,
    checksum: { 'groomly-dati.json': input.checksum },
  }
}
