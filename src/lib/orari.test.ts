import { describe, expect, it } from 'vitest'
import { copiaSuTutti, giornoChiuso, orariCompilati, proponibile } from './orari'

const lunedi = [{ da: '09:00', a: '13:00' }, { da: '15:00', a: '19:00' }]

describe('orari di apertura', () => {
  it('un giorno senza fasce è chiuso e copia su tutti replica', () => {
    expect(giornoChiuso([])).toBe(true)
    expect(giornoChiuso(undefined)).toBe(true)
    const tutti = copiaSuTutti(lunedi)
    expect(tutti[0]).toEqual(lunedi)
    expect(tutti[6]).toEqual(lunedi)
    expect(tutti[1]).not.toBe(lunedi)
  })

  it('un orario dentro la fascia è valido e la domenica vuota non è proponibile se gli orari sono compilati', () => {
    const orari = { ...copiaSuTutti(lunedi), 0: [] }
    expect(proponibile(orari, new Date(2026, 9, 26, 10, 0), '10:00')).toBe(true)
    expect(proponibile(orari, new Date(2026, 9, 26, 14, 0), '14:00')).toBe(false)
    expect(proponibile(orari, new Date(2026, 9, 25, 10, 0), '10:00')).toBe(false)
    expect(orariCompilati(undefined)).toBe(false)
    expect(proponibile(undefined, new Date(2026, 9, 25, 10, 0), '10:00')).toBe(true)
  })
})
