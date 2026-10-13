import { seedPriceSheet } from '../data/seed/priceSheet'
import type { SettingsMain } from '../data/local/settings'
import type { DogSize } from '../types/models'
import type { Breed, PriceKind, PriceSheet, SheetSectionId } from '../types/priceSheet'
import { priceSheetSchema } from './schemas'

export { iconForName } from './priceSheetIcon'

export type BulkOp = 'p5' | 'p10' | 'e+1' | 'e-1' | 'round'

export function getPriceSheet(settings: SettingsMain): PriceSheet {
  const parsed = priceSheetSchema.safeParse(settings.priceSheet)
  if (!parsed.success) return seedPriceSheet(settings.business)
  return parsed.data
}

function formatAmount(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace('.', ',')
}

export function formatPriceApp(item: { tipo: PriceKind; prezzo?: number }): string {
  if (item.tipo === 'valutazione') return 'su valutazione'
  const amount = formatAmount(item.prezzo ?? 0)
  return item.tipo === 'da' ? `da ${amount} €` : `${amount} €`
}

export function formatPricePaper(
  item: { tipo: PriceKind; prezzo?: number },
  scriviAPartireDa: boolean,
): { lead: string; amount: string } | { text: 'su valutazione' } {
  if (item.tipo === 'valutazione') return { text: 'su valutazione' }
  return {
    lead: item.tipo === 'da' && scriviAPartireDa ? 'a partire da ' : '',
    amount: formatAmount(item.prezzo ?? 0),
  }
}

export function breedsBySize(sheet: PriceSheet, taglia: DogSize): Breed[] {
  return sheet.razze.filter((breed) => breed.taglia === taglia)
}

function draftKey(parentId: string, itemId: string): string {
  return `${parentId}:${itemId}`
}

function applyOp(base: number, op: BulkOp): number {
  if (op === 'p5') return Math.round(base * 1.05)
  if (op === 'p10') return Math.round(base * 1.1)
  if (op === 'e+1') return base + 1
  if (op === 'e-1') return Math.max(0, base - 1)
  return Math.round(base)
}

function applyItem(
  next: Record<string, number>,
  key: string,
  item: { tipo: PriceKind; prezzo?: number },
  op: BulkOp,
) {
  if (item.tipo === 'valutazione' || item.prezzo == null) return
  const n = applyOp(next[key] ?? item.prezzo, op)
  if (n !== item.prezzo) next[key] = n
  else delete next[key]
}

export function applyBulk(
  sheet: PriceSheet,
  scope: DogSize | 'extra',
  op: BulkOp,
  draft: Record<string, number> = {},
): Record<string, number> {
  const next = { ...draft }
  if (scope === 'extra') {
    for (const voce of sheet.bagnoTosatura.voci) {
      applyItem(next, draftKey('bagnoTosatura', voce.id), voce, op)
    }
    for (const extra of sheet.extra.voci) {
      applyItem(next, draftKey(extra.id, extra.id), extra, op)
      for (const sotto of extra.sotto) applyItem(next, draftKey(extra.id, sotto.id), sotto, op)
    }
    return next
  }
  for (const breed of sheet.razze) {
    if (breed.taglia !== scope) continue
    for (const voce of breed.voci) applyItem(next, draftKey(breed.id, voce.id), voce, op)
  }
  return next
}

function withPrice<T extends { prezzo?: number }>(item: T, prezzo: number | undefined): T {
  if (prezzo === undefined) return item
  return { ...item, prezzo }
}

export function commitDraft(sheet: PriceSheet, draft: Record<string, number>, now?: string): PriceSheet {
  return {
    ...sheet,
    razze: sheet.razze.map((breed) => ({
      ...breed,
      voci: breed.voci.map((voce) => withPrice(voce, draft[draftKey(breed.id, voce.id)])),
    })),
    bagnoTosatura: {
      ...sheet.bagnoTosatura,
      voci: sheet.bagnoTosatura.voci.map((voce) => withPrice(voce, draft[draftKey('bagnoTosatura', voce.id)])),
    },
    extra: {
      ...sheet.extra,
      voci: sheet.extra.voci.map((extra) => ({
        ...withPrice(extra, draft[draftKey(extra.id, extra.id)]),
        sotto: extra.sotto.map((sotto) => withPrice(sotto, draft[draftKey(extra.id, sotto.id)])),
      })),
    },
    updatedAt: now ?? new Date().toISOString(),
  }
}

export function upsertBreed(sheet: PriceSheet, breed: Breed): PriceSheet {
  const index = sheet.razze.findIndex((row) => row.id === breed.id)
  if (index >= 0) {
    const razze = sheet.razze.slice()
    razze[index] = breed
    return { ...sheet, razze }
  }
  let last = -1
  for (let i = 0; i < sheet.razze.length; i++) {
    if (sheet.razze[i]?.taglia === breed.taglia) last = i
  }
  const razze = sheet.razze.slice()
  if (last >= 0) razze.splice(last + 1, 0, breed)
  else razze.push(breed)
  return { ...sheet, razze }
}

export function removeBreed(sheet: PriceSheet, id: string): PriceSheet {
  return { ...sheet, razze: sheet.razze.filter((breed) => breed.id !== id) }
}

export function duplicateBreed(sheet: PriceSheet, id: string, newId: () => string): PriceSheet {
  const index = sheet.razze.findIndex((breed) => breed.id === id)
  if (index < 0) return sheet
  const original = sheet.razze[index]!
  const copy: Breed = {
    ...original,
    id: newId(),
    nome: `${original.nome} (copia)`,
    voci: original.voci.map((voce) => ({ ...voce, id: newId() })),
  }
  const razze = sheet.razze.slice()
  razze.splice(index + 1, 0, copy)
  return { ...sheet, razze }
}

export function moveBreed(sheet: PriceSheet, id: string, delta: -1 | 1): PriceSheet {
  const index = sheet.razze.findIndex((breed) => breed.id === id)
  const next = index + delta
  if (index < 0 || next < 0 || next >= sheet.razze.length) return sheet
  if (sheet.razze[next]?.taglia !== sheet.razze[index]?.taglia) return sheet
  const razze = sheet.razze.slice()
  const current = razze[index]!
  razze[index] = razze[next]!
  razze[next] = current
  return { ...sheet, razze }
}

export function moveSection(sheet: PriceSheet, index: number, delta: -1 | 1): PriceSheet {
  const next = index + delta
  if (index < 0 || index >= sheet.sezioni.length || next < 0 || next >= sheet.sezioni.length) return sheet
  const sezioni = sheet.sezioni.slice()
  const current = sezioni[index]!
  sezioni[index] = sezioni[next]!
  sezioni[next] = current
  return { ...sheet, sezioni }
}

export function toggleSection(sheet: PriceSheet, id: SheetSectionId): PriceSheet {
  return {
    ...sheet,
    sezioni: sheet.sezioni.map((section) =>
      section.id === id ? { ...section, visibile: !section.visibile } : section,
    ),
  }
}

export function paginate(heights: number[], available: number): number {
  if (heights.length === 0) return 0
  if ((heights[0] ?? 0) > available) return 1
  let used = 0
  for (let i = 0; i < heights.length; i++) {
    const height = heights[i] ?? 0
    if (used + height > available) return i
    used += height
  }
  return heights.length
}

export function fitColumnScale(overflows: (k: number) => boolean): { k: number; ok: boolean } {
  let k = 1.12
  while (overflows(k) && k > 0.62) k = Math.round((k - 0.02) * 100) / 100
  return { k, ok: !overflows(k) }
}

export function fitTitleScale(overflows: (k: number) => boolean): number {
  let k = 1
  while (overflows(k) && k > 0.5) k = Math.max(0.5, Math.round((k - 0.04) * 100) / 100)
  return k
}
