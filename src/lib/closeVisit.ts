export const NOTE_MAX = 280

const INVALID_PRICE = 'Importo non valido'
const INVALID_TIME = 'Tempo non valido'

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
}): { total: number | null; actualDurationMin: number; adjustmentNote: string | null } {
  const note = input.note.trim()
  return {
    total: cents(input.quotedPrice) === cents(input.price) ? null : input.price,
    actualDurationMin: input.minutes,
    adjustmentNote: hasVariation(input.quotedPrice, input.quotedMinutes, input.price, input.minutes) && note ? note : null,
  }
}

function readClose(input: {
  quotedPrice: number
  quotedMinutes: number
  priceRaw: string
  hoursRaw: string
  minutesRaw: string
}): { varied: boolean } | null {
  const price = parseClosePrice(input.priceRaw)
  const duration = parseCloseDuration(input.hoursRaw, input.minutesRaw)
  if (!price.ok || !duration.ok) return null
  return { varied: hasVariation(input.quotedPrice, input.quotedMinutes, price.value, duration.value) }
}

export function canSkipClose(input: {
  quotedPrice: number
  quotedMinutes: number
  priceRaw: string
  hoursRaw: string
  minutesRaw: string
}): boolean {
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
}): boolean {
  const read = readClose(input)
  const note = input.note.trim()
  return read?.varied === true && note.length >= 1 && note.length <= NOTE_MAX
}
