import { normalizeEmail } from './salonPath'

export function normalizeVat(value: string): string {
  return value.replace(/\s/g, '')
}

export function normalizeTaxCode(value: string): string {
  return value.replace(/\s/g, '').toUpperCase()
}

export function vatError(value: string): string | null {
  const vat = normalizeVat(value)
  if (vat === '') return null
  return /^\d{11}$/.test(vat) ? null : '11 cifre, senza IT'
}

export function taxCodeError(value: string): string | null {
  const code = normalizeTaxCode(value)
  if (code === '') return null
  return /^[A-Z0-9]{16}$/.test(code) ? null : '16 lettere o numeri'
}

export function fiscalNoticeVisible(vat: string, taxCode: string): boolean {
  return normalizeVat(vat) === '' && normalizeTaxCode(taxCode) === ''
}

export { normalizeEmail }
