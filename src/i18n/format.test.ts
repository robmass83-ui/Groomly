import { describe, expect, it } from 'vitest'
import { confrontaNomi, dataBreve, dataConOra, dataEstesa, euro, formaPlurale } from './format'

const venticinque = new Date(2026, 9, 25, 12)

describe('euro e date', () => {
  it('l’italiano resta come oggi', () => {
    expect(euro('it', 1234.56)).toBe('€ 1.234,56')
    expect(euro('it', 25)).toBe('€ 25')
    expect(dataBreve('it', new Date(2026, 9, 1, 12))).toBe('Giovedì 1 ottobre')
  })

  it('inglese britannico e spagnolo di Spagna', () => {
    expect(euro('en', 1234.56)).toBe('€1,234.56')
    expect(euro('es', 1234.56)).toBe('1.234,56 €')
    expect(dataEstesa('en', venticinque)).toBe('25 October 2026')
    expect(dataEstesa('es', venticinque)).toBe('25 de octubre de 2026')
  })

  it('francese e tedesco', () => {
    expect(euro('fr', 1234.56)).toBe('1\u00A0234,56\u00A0€')
    expect(euro('de', 1234.56)).toBe('1.234,56\u00A0€')
    expect(dataEstesa('fr', new Date(2026, 10, 4, 12))).toBe('4 novembre 2026')
    expect(dataEstesa('de', new Date(2026, 10, 4, 12))).toBe('4. November 2026')
    expect(dataConOra('fr', new Date(2026, 10, 4, 9, 5))).toBe('Mercredi 4 novembre à 09:05')
    expect(dataConOra('de', new Date(2026, 10, 4, 9, 5))).toBe('Mittwoch, 4. November um 09:05')
  })

  it('lo zero inglese non usa il singolare', () => {
    const forme = { one: 'dog', other: 'dogs' }
    expect(formaPlurale('en', 0, forme)).toBe('dogs')
    expect(formaPlurale('en', 1, forme)).toBe('dog')
    expect(formaPlurale('it', 0, { one: 'cane', other: 'cani' })).toBe('cani')
  })

  it('ordina i nomi con la lingua', () => {
    expect(confrontaNomi('it', 'Árya', 'Zoe')).toBeLessThan(0)
  })
})
