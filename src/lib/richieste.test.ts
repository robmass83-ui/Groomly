import { describe, expect, it } from 'vitest'
import { accettaRichiesta, canePerTelefono, fineBlocco, righeBiglietto } from './richieste'

describe('richieste del salone', () => {
  it('accettare crea un programmato e toglie lo stato nuova', () => {
    const creata = new Date('2026-10-26T09:00:00.000Z')
    const esito = accettaRichiesta({ id: 'r1', status: 'nuova', dogId: 'rex', inizio: creata })
    expect(esito?.stato).toBe('accettata')
    expect(esito?.appuntamento).toEqual({ status: 'programmato', dogId: 'rex', start: creata, richiestaId: 'r1' })
    expect(accettaRichiesta({ id: 'r1', status: 'accettata', dogId: 'rex', inizio: creata })).toBeNull()
  })

  it('il blocco dura 48 ore e lo stesso cellulare propone il cane già in scheda', () => {
    const creata = new Date('2026-10-26T09:00:00.000Z')
    expect(fineBlocco(creata).getTime() - creata.getTime()).toBe(48 * 60 * 60 * 1000)
    expect(canePerTelefono([{ id: 'rex', phone: '333 123 4567' }], '3331234567')).toBe('rex')
    expect(canePerTelefono([{ id: 'rex', phone: '333' }], '340')).toBeNull()
    expect(righeBiglietto('Bauci', 'https://groomlyapp.it/i-pelosetti')).toEqual({
      formato: 'a5',
      righe: ['Bauci', 'https://groomlyapp.it/i-pelosetti'],
    })
  })
})
