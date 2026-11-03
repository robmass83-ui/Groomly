import type { Lingua } from '../i18n/lingua'
import { t } from '../i18n/t'
import { normalizeEmail } from './salonPath'
import { erroreIva, esempioIva, type CodicePaese } from './paese'

export function normalizeVat(value: string): string {
  return value.replace(/\s/g, '')
}

export function normalizeTaxCode(value: string): string {
  return value.replace(/\s/g, '').toUpperCase()
}

export function vatError(value: string, paese: CodicePaese = 'IT', lingua: Lingua = 'it'): string | null {
  return erroreIva(value, paese) === null ? null : t(lingua, 'ivaFormato', { esempio: esempioIva(paese) })
}

export function taxCodeError(value: string, lingua: Lingua = 'it'): string | null {
  const code = normalizeTaxCode(value)
  if (code === '') return null
  return /^[A-Z0-9]{16}$/.test(code) ? null : t(lingua, 'cfFormato')
}

export function fiscalNoticeVisible(vat: string, taxCode: string): boolean {
  return normalizeVat(vat) === '' && normalizeTaxCode(taxCode) === ''
}

export { normalizeEmail }
