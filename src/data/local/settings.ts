import { firebaseEnabled } from '../firebase/enabled'
import type { ThemeChoice } from '../../theme/theme'
import { readJson, storageKeys, writeJson } from './storage'

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

export interface SettingsMain {
  theme: ThemeChoice
  updatedAt: string
  recentDogIds: string[]
  fieldLabels: FieldLabels
  tagSuggestions: string[]
  toolSuggestions: string[]
  productSuggestions: string[]
  business: { name: string; vatNumber: string; phone: string; address: string }
  priceList?: PriceFile
  priceListHistory: PriceFile[]
  monthlyReminder: { enabled: boolean; time: string; daysBefore: number }
  backup: { lastAt?: string; autoDaily: boolean; snapshot?: unknown }
  ageThresholds: { giovaneFrom: number; adultoFrom: number; anzianoFrom: number }
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
    business: { name: '', vatNumber: '', phone: '', address: '' },
    priceListHistory: [],
    monthlyReminder: { enabled: true, time: '18:30', daysBefore: 7 },
    backup: { autoDaily: false },
    ageThresholds: { giovaneFrom: 1, adultoFrom: 3, anzianoFrom: 8 },
  }
}

function mergeSettings(existing: Partial<SettingsMain> & Pick<SettingsMain, 'theme' | 'updatedAt'>): SettingsMain {
  const base = blankSettings(existing.theme, existing.updatedAt)
  return {
    ...base,
    ...existing,
    fieldLabels: { ...base.fieldLabels, ...existing.fieldLabels },
    business: { ...base.business, ...existing.business },
    monthlyReminder: { ...base.monthlyReminder, ...existing.monthlyReminder },
    backup: { ...base.backup, ...existing.backup },
    ageThresholds: { ...base.ageThresholds, ...existing.ageThresholds },
    recentDogIds: existing.recentDogIds ?? base.recentDogIds,
    tagSuggestions: existing.tagSuggestions ?? base.tagSuggestions,
    toolSuggestions: existing.toolSuggestions ?? base.toolSuggestions,
    productSuggestions: existing.productSuggestions ?? base.productSuggestions,
    priceListHistory: existing.priceListHistory ?? base.priceListHistory,
    priceList: existing.priceList ?? base.priceList,
  }
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

export function priceFileMeta(file: PriceFile): string {
  const size = formatByteSize(file.byteSize)
  if (file.mime.startsWith('image/')) return `Immagine · ${size}`
  if (typeof file.pageCount === 'number') {
    const pages = file.pageCount === 1 ? '1 pagina' : `${file.pageCount} pagine`
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
