import { describe, expect, it } from 'vitest'
import { bannerBackup, millisecondiFrequenza, statoDrive, tonoBackup } from './statoDrive'

describe('stato del backup su Drive', () => {
  const now = new Date('2026-10-24T12:00:00.000Z')

  it('la frequenza allunga l’intervallo', () => {
    expect(millisecondiFrequenza('giorno')).toBe(24 * 60 * 60 * 1000)
    expect(millisecondiFrequenza('settimana')).toBe(7 * 24 * 60 * 60 * 1000)
    expect(millisecondiFrequenza(undefined)).toBe(24 * 60 * 60 * 1000)
  })

  it('il chip è verde, arancione o rosso', () => {
    expect(statoDrive({ ultimo: null, errore: false, now })).toBeNull()
    expect(statoDrive({ ultimo: now.toISOString(), errore: false, now })?.tono).toBe('ok')
    expect(statoDrive({ ultimo: '2026-10-01T00:00:00.000Z', errore: false, frequenza: 'giorno', now })?.tono).toBe('warn')
    expect(statoDrive({ ultimo: now.toISOString(), errore: true, now })).toEqual({ testo: 'Errore', tono: 'bad' })
  })

  it('il banner in home compare dopo due cicli falliti', () => {
    expect(bannerBackup({ ultimo: now.toISOString(), errore: true, now })).toBeNull()
    expect(bannerBackup({ ultimo: '2026-10-01T00:00:00.000Z', errore: true, now })).toBe('Il backup automatico non funziona. Aprilo in Impostazioni.')
  })
})

describe('tonoBackup', () => {
  const adesso = new Date('2026-11-03T10:00:00')

  it('senza una data valida è giallo', () => {
    expect(tonoBackup(undefined, undefined, adesso)).toBe('warn')
    expect(tonoBackup('non-una-data', undefined, adesso)).toBe('warn')
  })

  it('è verde dentro frequenza più un giorno, giallo oltre', () => {
    expect(tonoBackup('2026-11-03T08:00:00', 'giorno', adesso)).toBe('ok')
    expect(tonoBackup('2026-10-01T08:00:00', 'giorno', adesso)).toBe('warn')
    expect(tonoBackup('2026-10-30T08:00:00', 'settimana', adesso)).toBe('ok')
  })
})
