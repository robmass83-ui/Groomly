import type { PaymentMethod } from '../types/models'

export const NOTE_MAX = 280
export const NA_PRICE_MESSAGE = 'Con N/A il prezzo deve essere 0'
export const PRICE_NOTE_MESSAGE = 'Scrivi perché il prezzo è diverso'

export const INVALID_PRICE = 'Importo non valido'
export const INVALID_TIME = 'Tempo non valido'

export type ClosePatch = {
  total: number | null
  actualDurationMin: number
  adjustmentNote: string | null
  paymentMethod: PaymentMethod
}

export function splitDuration(minutes: number): { hours: number; minutes: number } {
  const hours = Math.floor(minutes / 60)
  return { hours, minutes: minutes - hours * 60 }
}

export function formatSpent(minutes: number): string {
  const { hours, minutes: rest } = splitDuration(minutes)
  if (hours >= 1) return `${hours} h ${String(rest).padStart(2, '0')}`
  return `${rest} min`
}

export function parseClosePrice(raw: string): { ok: true; value: number } | { ok: false; message: 'Importo non valido' } {
  const normalized = raw.trim().replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return { ok: false, message: INVALID_PRICE }
  return { ok: true, value: Number(normalized) }
}

export function parseCloseDuration(
  hoursRaw: string,
  minutesRaw: string,
): { ok: true; value: number } | { ok: false; message: 'Tempo non valido' } {
  if (!/^\d+$/.test(hoursRaw) || !/^\d+$/.test(minutesRaw)) return { ok: false, message: INVALID_TIME }
  const hours = Number(hoursRaw)
  const minutes = Number(minutesRaw)
  const total = hours * 60 + minutes
  if (hours > 24 || minutes > 59 || total < 1 || total > 1440) return { ok: false, message: INVALID_TIME }
  return { ok: true, value: total }
}

function cents(value: number): number {
  return Math.round(value * 100)
}

export function hasVariation(quotedPrice: number, quotedMinutes: number, price: number, minutes: number): boolean {
  return cents(quotedPrice) !== cents(price) || cents(quotedMinutes) !== cents(minutes)
}

export function closePatch(input: {
  quotedPrice: number
  quotedMinutes: number
  price: number
  minutes: number
  note: string
  paymentMethod: PaymentMethod
}): ClosePatch {
  const note = input.note.trim()
  let total: number | null
  if (cents(input.quotedPrice) === cents(input.price)) {
    total = null
  } else if (input.paymentMethod === 'na' && cents(input.quotedPrice) > 0) {
    total = 0
  } else {
    total = input.price
  }
  return {
    total,
    actualDurationMin: input.minutes,
    adjustmentNote: note ? note : null,
    paymentMethod: input.paymentMethod,
  }
}

function readClose(input: {
  quotedPrice: number
  quotedMinutes: number
  priceRaw: string
  hoursRaw: string
  minutesRaw: string
}): { varied: boolean; priceChanged: boolean; price: number; minutes: number } | null {
  const price = parseClosePrice(input.priceRaw)
  const duration = parseCloseDuration(input.hoursRaw, input.minutesRaw)
  if (!price.ok || !duration.ok) return null
  const priceChanged = cents(input.quotedPrice) !== cents(price.value)
  const varied = hasVariation(input.quotedPrice, input.quotedMinutes, price.value, duration.value)
  return { varied, priceChanged, price: price.value, minutes: duration.value }
}

function noteRequired(priceChanged: boolean, payment: PaymentMethod | null): boolean {
  return priceChanged && payment !== 'na'
}

function noteOk(note: string, required: boolean): boolean {
  if (!required) return true
  const trimmed = note.trim()
  return trimmed.length >= 1 && trimmed.length <= NOTE_MAX
}

export function mancaNotaPrezzo(input: { quotedPrice: number; priceRaw: string; note: string; payment: PaymentMethod | null }): boolean {
  const price = parseClosePrice(input.priceRaw)
  if (!price.ok) return false
  if (cents(input.quotedPrice) === cents(price.value)) return false
  if (input.payment === 'na') return false
  return input.note.trim().length < 1
}

export function naBlocks(input: { priceRaw: string; payment: PaymentMethod | null }): boolean {
  if (input.payment !== 'na') return false
  const price = parseClosePrice(input.priceRaw)
  if (!price.ok) return false
  return cents(price.value) !== 0
}

export function canSkipClose(input: {
  quotedPrice: number
  quotedMinutes: number
  priceRaw: string
  hoursRaw: string
  minutesRaw: string
  payment: PaymentMethod | null
}): boolean {
  if (input.payment === null) return false
  if (naBlocks({ priceRaw: input.priceRaw, payment: input.payment })) return false
  const read = readClose(input)
  return read !== null && !read.varied
}

export function canSaveClose(input: {
  quotedPrice: number
  quotedMinutes: number
  priceRaw: string
  hoursRaw: string
  minutesRaw: string
  note: string
  payment: PaymentMethod | null
  allowSame: boolean
}): boolean {
  if (input.payment === null) return false
  if (naBlocks({ priceRaw: input.priceRaw, payment: input.payment })) return false
  const read = readClose(input)
  if (read === null) return false
  if (!input.allowSame && !read.varied) return false
  if (!noteOk(input.note, noteRequired(read.priceChanged, input.payment))) return false
  return true
}
