import { describe, expect, it } from 'vitest'
import { chiusuraSuperata, copiaSuTutti, giornoChiuso, orariCompilati, primaApertura, proponibile, prossimoGiornoAperto } from './orari'

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

const ORARI = {
  1: lunedi, 2: lunedi, 3: lunedi, 4: lunedi, 5: lunedi,
  6: [{ da: '09:00', a: '13:00' }],
}
const lun = (h: number, m: number) => new Date(2026, 10, 9, h, m)

describe('chiusura e giorni aperti', () => {
  it('chiusuraSuperata segnala la chiusura della fascia dell’inizio', () => {
    expect(chiusuraSuperata(ORARI, lun(12, 0), lun(13, 0))).toBeNull()
    expect(chiusuraSuperata(ORARI, lun(12, 45), lun(14, 45))).toBe('13:00')
    expect(chiusuraSuperata(ORARI, lun(18, 30), lun(19, 30))).toBe('19:00')
    expect(chiusuraSuperata(ORARI, lun(14, 0), lun(15, 30))).toBeNull()
    expect(chiusuraSuperata(undefined, lun(12, 45), lun(14, 45))).toBeNull()
  })

  it('una fine il giorno dopo conta come sforamento', () => {
    expect(chiusuraSuperata(ORARI, lun(18, 30), new Date(2026, 10, 10, 0, 30))).toBe('19:00')
  })

  it('prossimoGiornoAperto salta i giorni chiusi', () => {
    expect(prossimoGiornoAperto(ORARI, new Date(2026, 10, 8, 10, 0))).toEqual(new Date(2026, 10, 9, 10, 0))
    expect(prossimoGiornoAperto(ORARI, new Date(2026, 10, 10, 10, 0))).toEqual(new Date(2026, 10, 10, 10, 0))
    expect(prossimoGiornoAperto({}, new Date(2026, 10, 8, 10, 0))).toEqual(new Date(2026, 10, 8, 10, 0))
  })

  it('primaApertura è il da della prima fascia', () => {
    expect(primaApertura(ORARI, lun(10, 0))).toBe('09:00')
    expect(primaApertura(ORARI, new Date(2026, 10, 8, 10, 0))).toBeNull()
  })
})
