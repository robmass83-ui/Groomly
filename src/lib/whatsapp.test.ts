import { describe, expect, it } from 'vitest'
import { normalizzaTelefono, renderTemplate, urlWhatsApp } from './whatsapp'

const numeri = [
  ['333 123 4567', '393331234567'],
  ['3331234567', '393331234567'],
  ['+39 333 123 4567', '393331234567'],
  ['+393331234567', '393331234567'],
  ['0039 333 1234567', '393331234567'],
  ['00393331234567', '393331234567'],
  ['39 333 123 4567', '393331234567'],
  ['333-123-4567', '393331234567'],
  ['333.123.4567', '393331234567'],
  ['(333) 1234567', '393331234567'],
  ['+39.333.1234567', '393331234567'],
  ['393331234567', '393331234567'],
] as const

describe('whatsapp', () => {
  it('normalizza almeno dodici numeri italiani', () => {
    expect(numeri).toHaveLength(12)
    for (const [raw, atteso] of numeri) expect(normalizzaTelefono(raw)).toBe(atteso)
    expect(normalizzaTelefono('021234567')).toBeNull()
    expect(normalizzaTelefono('')).toBeNull()
  })

  it('compila il testo e costruisce il link', () => {
    expect(renderTemplate('Ciao {{ nome }}, domani {{cane}}', { nome: 'Ada', cane: 'Rex' })).toBe('Ciao Ada, domani Rex')
    expect(urlWhatsApp('393331234567', 'Ciao Rex')).toBe('https://wa.me/393331234567?text=Ciao%20Rex')
  })
})
