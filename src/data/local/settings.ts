import { firebaseEnabled } from '../firebase/enabled'
import type { ThemeChoice } from '../../theme/theme'
import type { PriceSheet } from '../../types/priceSheet'
import { normalizeTaxCode } from '../../lib/profile'
import type { OrariSettimana } from '../../lib/orari'
import type { ChiaveServizioEmail, ModoServizio, SceltaServizio } from '../../lib/serviziEmail'
import { readJson, storageKeys, writeJson } from './storage'

const CHIAVI_SERVIZI_EMAIL: ChiaveServizioEmail[] = ['promemoria', 'pronto', 'auguri', 'recensione', 'attesa', 'fedelta']

function leggiModoServizio(value: unknown): ModoServizio | undefined {
  return value === 'spento' || value === 'manuale' || value === 'automatico' ? value : undefined
}

function leggiSceltaServizio(value: unknown): SceltaServizio | undefined {
  if (!value || typeof value !== 'object') return undefined
  const raw = value as Partial<SceltaServizio>
  const modo = leggiModoServizio(raw.modo)
  if (!modo) return undefined
  const scelta: SceltaServizio = { modo }
  if (raw.anticipoGiorni === 1 || raw.anticipoGiorni === 2 || raw.anticipoGiorni === 3) {
    scelta.anticipoGiorni = raw.anticipoGiorni
  }
  if (typeof raw.ora === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(raw.ora)) scelta.ora = raw.ora
  return scelta
}

function leggiServiziEmail(
  value: unknown,
  fedeltaAccesa: boolean,
): Partial<Record<ChiaveServizioEmail, SceltaServizio>> | undefined {
  const puliti: Partial<Record<ChiaveServizioEmail, SceltaServizio>> = {}
  if (value && typeof value === 'object') {
    for (const chiave of CHIAVI_SERVIZI_EMAIL) {
      const scelta = leggiSceltaServizio((value as Record<string, unknown>)[chiave])
      if (scelta) puliti[chiave] = scelta
    }
  }
  if (fedeltaAccesa && !puliti.fedelta) puliti.fedelta = { modo: 'manuale' }
  return Object.keys(puliti).length > 0 ? puliti : undefined
}

export interface FieldLabels {
  species: string
  breed: string
  sex: string
  age: string
  weight: string
  size: string
  clientType: string
  avgDuration: string
}

export interface PriceFile {
  id: string
  fileName: string
  mime: string
  byteSize: number
  uploadedAt: string
  dataUrl: string
  pageCount?: number
}

export interface ExportPrefs {
  formato: 'pdf' | 'csv'
  periodo: 'mese' | 'anno' | 'intervallo'
  include: { riepilogo: boolean; dettaglio: boolean; attivita: boolean; mancati: boolean; pagamento?: boolean }
}

export const DEFAULT_EXPORT: ExportPrefs = {
  formato: 'pdf',
  periodo: 'mese',
  include: { riepilogo: true, dettaglio: true, attivita: true, mancati: false, pagamento: true },
}

export function readBadge(value: unknown): string | undefined {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined
}

export function segnaBadgeReport(role: string | undefined, updatedAt: string, badge: unknown): boolean {
  if (role === 'collaboratore') return false
  if (updatedAt === '') return false
  if (readBadge(badge)) return false
  return true
}

export function readExportPrefs(value: unknown): ExportPrefs | undefined {
  if (value === undefined) return undefined
  if (!value || typeof value !== 'object') return { ...DEFAULT_EXPORT, include: { ...DEFAULT_EXPORT.include } }
  const raw = value as Partial<ExportPrefs>
  const formato = raw.formato === 'csv' ? 'csv' : 'pdf'
  const periodo = raw.periodo === 'anno' || raw.periodo === 'intervallo' ? raw.periodo : 'mese'
  const include = raw.include
  if (!include || typeof include !== 'object') return { ...DEFAULT_EXPORT, formato, periodo, include: { ...DEFAULT_EXPORT.include } }
  const dettaglio = include.dettaglio === true
  return {
    formato,
    periodo,
    include: {
      riepilogo: include.riepilogo === true || !dettaglio,
      dettaglio,
      attivita: include.attivita === true,
      mancati: include.mancati === true,
      pagamento: include.pagamento !== false,
    },
  }
}

export interface VoceAttesa {
  id: string
  dogId: string
  durataMin: number
  preferenza: 'mattina' | 'pomeriggio' | 'qualsiasi'
  arrivato: string
  giorno?: string
}

export interface SettingsMain {
  theme: ThemeChoice
  updatedAt: string
  recentDogIds: string[]
  fieldLabels: FieldLabels
  tagSuggestions: string[]
  toolSuggestions: string[]
  productSuggestions: string[]
  business: { salonName: string; titolare: string; name: string; vatNumber: string; phone: string; address: string; taxCode: string }
  priceList?: PriceFile
  priceSheet?: PriceSheet
  priceListHistory: PriceFile[]
  monthlyReminder: { enabled: boolean; time: string; daysBefore: number }
  backup: { lastAt?: string; impostato?: boolean; autoDaily: boolean; snapshot?: unknown; frequenza?: 'giorno' | 'settimana' | 'mese'; soloWifi?: boolean; soloCarica?: boolean }
  ageThresholds: { giovaneFrom: number; adultoFrom: number; anzianoFrom: number }
  ui: { hideAmounts: boolean; reportBadgeSince?: string; ultimaProposta?: string }
  linguaClienti?: 'it' | 'en' | 'es'
  consensoMetriche?: boolean
  emailPromo?: boolean
  telefonoRecupero?: string
  exportPrefs?: ExportPrefs
  avvisiInviati?: Record<string, boolean>
  orari?: OrariSettimana
  linkRecensioni?: string
  proposteRecensione?: { dogId: string; at: string }[]
  fedeltaAccesa?: boolean
  serviziEmail?: Partial<Record<ChiaveServizioEmail, SceltaServizio>>
  prenotazioniOnline?: boolean
  premiInAttesa?: Record<string, boolean>
  attesa?: VoceAttesa[]
  strumenti?: { messaggi?: boolean; affidabilita?: boolean; noteVocali?: boolean }
}

const DEFAULT_LABELS: FieldLabels = {
  species: 'Specie',
  breed: 'Razza',
  sex: 'Sesso',
  age: 'Età',
  weight: 'Peso',
  size: 'Taglia',
  clientType: 'Cliente',
  avgDuration: 'Durata media',
}

export function blankSettings(theme: ThemeChoice, updatedAt: string): SettingsMain {
  return {
    theme,
    updatedAt,
    recentDogIds: [],
    fieldLabels: { ...DEFAULT_LABELS },
    tagSuggestions: [],
    toolSuggestions: [],
    productSuggestions: [],
    business: { salonName: '', titolare: '', name: '', vatNumber: '', phone: '', address: '', taxCode: '' },
    priceListHistory: [],
    monthlyReminder: { enabled: true, time: '18:30', daysBefore: 7 },
    backup: { autoDaily: false },
    ageThresholds: { giovaneFrom: 1, adultoFrom: 3, anzianoFrom: 8 },
    ui: { hideAmounts: false },
  }
}

export function backupPulito(base: SettingsMain['backup'], existing: Partial<SettingsMain['backup']> | undefined): SettingsMain['backup'] {
  const backup = { ...base, ...existing }
  if (backup.impostato === true) backup.impostato = true
  else delete backup.impostato
  return backup
}

function mergeSettings(existing: Partial<SettingsMain> & Pick<SettingsMain, 'theme' | 'updatedAt'>): SettingsMain {
  const base = blankSettings(existing.theme, existing.updatedAt)
  const badge = readBadge(existing.ui?.reportBadgeSince)
  const exportPrefs = readExportPrefs(existing.exportPrefs)
  const fedeltaAccesa = existing.fedeltaAccesa === true
  const serviziEmail = leggiServiziEmail(existing.serviziEmail, fedeltaAccesa)
  const merged: SettingsMain = {
    ...base,
    ...existing,
    fieldLabels: { ...base.fieldLabels, ...existing.fieldLabels },
    business: {
      ...base.business,
      ...(existing.business ?? {}),
      salonName: typeof existing.business?.salonName === 'string' ? existing.business.salonName.trim() : '',
      titolare: typeof existing.business?.titolare === 'string' ? existing.business.titolare.trim() : '',
      taxCode: normalizeTaxCode(existing.business?.taxCode ?? ''),
    },
    monthlyReminder: { ...base.monthlyReminder, ...existing.monthlyReminder },
    backup: backupPulito(base.backup, existing.backup),
    ageThresholds: { ...base.ageThresholds, ...existing.ageThresholds },
    ui: {
      hideAmounts: existing.ui?.hideAmounts === true,
      ...(badge ? { reportBadgeSince: badge } : {}),
      ...(typeof existing.ui?.ultimaProposta === 'string' ? { ultimaProposta: existing.ui.ultimaProposta } : {}),
    },
    ...(exportPrefs ? { exportPrefs } : {}),
    recentDogIds: existing.recentDogIds ?? base.recentDogIds,
    tagSuggestions: existing.tagSuggestions ?? base.tagSuggestions,
    toolSuggestions: existing.toolSuggestions ?? base.toolSuggestions,
    productSuggestions: existing.productSuggestions ?? base.productSuggestions,
    priceListHistory: existing.priceListHistory ?? base.priceListHistory,
    priceList: existing.priceList ?? base.priceList,
    priceSheet: existing.priceSheet ?? base.priceSheet,
    ...(leggiAvvisi(existing.avvisiInviati) ? { avvisiInviati: leggiAvvisi(existing.avvisiInviati) } : {}),
    linkRecensioni: leggiLink(existing.linkRecensioni),
    proposteRecensione: leggiProposte(existing.proposteRecensione),
    fedeltaAccesa,
    prenotazioniOnline: existing.prenotazioniOnline === true,
    consensoMetriche: existing.consensoMetriche === true,
    emailPromo: existing.emailPromo === true,
    ...(typeof existing.telefonoRecupero === 'string' && existing.telefonoRecupero.trim()
      ? { telefonoRecupero: existing.telefonoRecupero.trim() }
      : {}),
    ...(leggiAvvisi(existing.premiInAttesa) ? { premiInAttesa: leggiAvvisi(existing.premiInAttesa) } : {}),
    ...(Array.isArray(existing.attesa) ? { attesa: existing.attesa } : {}),
  }
  if (serviziEmail) merged.serviziEmail = serviziEmail
  else delete merged.serviziEmail
  return merged
}

function leggiLink(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().startsWith('https://') ? value.trim() : undefined
}

function leggiProposte(value: unknown): { dogId: string; at: string }[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const dogId = 'dogId' in item && typeof item.dogId === 'string' ? item.dogId : ''
    const at = 'at' in item && typeof item.at === 'string' ? item.at : ''
    if (!dogId || Number.isNaN(new Date(at).getTime())) return []
    return [{ dogId, at }]
  }).slice(-40)
}

function leggiAvvisi(value: SettingsMain['avvisiInviati']): Record<string, boolean> | undefined {
  if (!value || typeof value !== 'object') return undefined
  const puliti: Record<string, boolean> = {}
  for (const [key, flag] of Object.entries(value)) {
    if (flag === true && key.length > 0 && key.length < 120) puliti[key] = true
  }
  return Object.keys(puliti).length > 0 ? puliti : undefined
}

export function getSettings(uid: string): SettingsMain {
  const existing = readJson<Partial<SettingsMain>>(storageKeys.settings(uid))
  if (existing) {
    return mergeSettings({
      theme: existing.theme ?? 'auto',
      updatedAt: existing.updatedAt ?? new Date().toISOString(),
      ...existing,
    })
  }
  const created = blankSettings('auto', new Date().toISOString())
  if (!firebaseEnabled()) writeJson(storageKeys.settings(uid), created)
  return created
}

export function setTheme(uid: string, theme: ThemeChoice): SettingsMain {
  const current = getSettings(uid)
  const next: SettingsMain = { ...current, theme, updatedAt: new Date().toISOString() }
  writeJson(storageKeys.settings(uid), next)
  return next
}

export function rememberDog(settings: SettingsMain, dogId: string): SettingsMain {
  const recentDogIds = [dogId, ...settings.recentDogIds.filter((id) => id !== dogId)].slice(0, 8)
  return { ...settings, recentDogIds }
}

export function setFieldLabel(uid: string, key: keyof FieldLabels, label: string): SettingsMain {
  const current = getSettings(uid)
  const next: SettingsMain = {
    ...current,
    fieldLabels: { ...current.fieldLabels, [key]: label },
    updatedAt: new Date().toISOString(),
  }
  writeJson(storageKeys.settings(uid), next)
  return next
}

export function listPriceFiles(settings: SettingsMain): PriceFile[] {
  return [...(settings.priceList ? [settings.priceList] : []), ...settings.priceListHistory]
}

export function addPriceFile(settings: SettingsMain, file: PriceFile): SettingsMain {
  if (!settings.priceList) return { ...settings, priceList: file }
  return { ...settings, priceListHistory: [...settings.priceListHistory, file] }
}

export function renamePriceFile(settings: SettingsMain, id: string, fileName: string): SettingsMain {
  const name = fileName.trim()
  if (!name) return settings
  const rename = (file: PriceFile): PriceFile => (file.id === id ? { ...file, fileName: name } : file)
  return {
    ...settings,
    priceList: settings.priceList ? rename(settings.priceList) : undefined,
    priceListHistory: settings.priceListHistory.map(rename),
  }
}

export function removePriceFile(settings: SettingsMain, id: string): SettingsMain {
  const [priceList, ...priceListHistory] = listPriceFiles(settings).filter((file) => file.id !== id)
  return { ...settings, priceList, priceListHistory }
}

function keptIds(keepId?: string | readonly string[]): Set<string> {
  if (!keepId) return new Set()
  return new Set(typeof keepId === 'string' ? [keepId] : keepId)
}

export function dropOldestPrice(settings: SettingsMain, keepId?: string | readonly string[]): SettingsMain {
  const keep = keptIds(keepId)
  let chosen = -1
  settings.priceListHistory.forEach((file, index) => {
    if (keep.has(file.id)) return
    if (chosen < 0) {
      chosen = index
      return
    }
    const current = settings.priceListHistory[chosen]
    if (!current) return
    if (file.uploadedAt < current.uploadedAt || (file.uploadedAt === current.uploadedAt && index > chosen)) chosen = index
  })
  if (chosen < 0) return settings
  return { ...settings, priceListHistory: settings.priceListHistory.filter((_, index) => index !== chosen) }
}

const BYTES_IN_MB = 1024 * 1024

function formatByteSize(byteSize: number): string {
  if (byteSize < BYTES_IN_MB) return `${Math.round(byteSize / 1024)} KB`
  const formatted = new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(byteSize / BYTES_IN_MB)
  return `${formatted} MB`
}

export function priceFileMeta(file: PriceFile, parole?: { immagine: string; pagina: string; pagine: string }): string {
  const size = formatByteSize(file.byteSize)
  const immagine = parole?.immagine ?? 'Immagine'
  const pagina = parole?.pagina ?? '1 pagina'
  const pagine = parole?.pagine ?? '{{n}} pagine'
  if (file.mime.startsWith('image/')) return `${immagine} · ${size}`
  if (typeof file.pageCount === 'number') {
    const pages = file.pageCount === 1 ? pagina : pagine.replace('{{n}}', String(file.pageCount))
    return `${pages} · ${size}`
  }
  return `PDF · ${size}`
}

export function pdfPageCount(text: string): number | undefined {
  const count = text.match(/\/Type \/Page(?!s)/g)?.length ?? 0
  return count > 0 ? count : undefined
}

export function setTagSuggestions(uid: string, tagSuggestions: string[]): SettingsMain {
  const current = getSettings(uid)
  const next: SettingsMain = {
    ...current,
    tagSuggestions: [...tagSuggestions],
    updatedAt: new Date().toISOString(),
  }
  writeJson(storageKeys.settings(uid), next)
  return next
}
