import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { giornoRoma } from '../../../src/lib/disponibilita'

const { archivio } = vi.hoisted(() => ({ archivio: new Map<string, Record<string, unknown>>() }))
vi.mock('firebase-admin/firestore', async () => (await import('./firestoreFinto.testutil')).firestoreFinto(archivio))

import { postiLiberiPer } from './postiLiberi'

const giorno = '2026-11-10'

function preparaSalone(prenotazioniOnline: boolean, conPiano = true) {
  archivio.clear()
  archivio.set('salons/s1/settings/main', { prenotazioniOnline, orari: { [giornoRoma(giorno)]: [{ da: '09:00', a: '13:00' }] } })
  if (conPiano) archivio.set('salons/s1/pro/main', { piano: 'pro', stato: 'attivo', fonte: 'manuale' })
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-02T08:00:00Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('posti liberi per il salone', () => {
  it('il cliente a prenotazioni spente riceve ancora «Prenotazioni spente»', async () => {
    preparaSalone(false)
    await expect(postiLiberiPer('s1', giorno, 60)).rejects.toThrow('Prenotazioni spente')
  })

  it('il salone a prenotazioni spente vede gli orari liberi', async () => {
    preparaSalone(false)
    expect((await postiLiberiPer('s1', giorno, 60, '', { perSalone: true })).orari).toEqual(['09:00', '10:00', '11:00', '12:00'])
  })

  it('il salone senza piano vede gli orari liberi', async () => {
    preparaSalone(false, false)
    expect((await postiLiberiPer('s1', giorno, 60, '', { perSalone: true })).orari).toEqual(['09:00', '10:00', '11:00', '12:00'])
  })

  it('un servizio di 240 minuti parte solo alle 09:00', async () => {
    preparaSalone(true)
    expect((await postiLiberiPer('s1', giorno, 240)).orari).toEqual(['09:00'])
  })

  it('un servizio di 300 minuti in una fascia di 4 ore non ha orari', async () => {
    preparaSalone(true)
    expect((await postiLiberiPer('s1', giorno, 300)).orari).toEqual([])
  })
})
