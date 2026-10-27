import { describe, expect, it } from 'vitest'
import { pianoRichiesta, type RichiestaDoc } from '../../../src/lib/pianoRichiesta'
import { archivioDelCane } from './gestisciPrenotazione'

const richiesta: RichiestaDoc = {
  status: 'proposta', token: 't', nome: 'Ada', phone: '333', email: 'a@b.it', cane: 'Fido', razza: 'Meticcio',
  specie: 'cane', taglia: 'media', foto: [], start: '2026-10-28T09:00:00.000Z', end: '2026-10-28T10:00:00.000Z',
  sceltaAnimale: 'dog1', appointmentId: 'app1', scadeIl: '2026-10-28T12:00:00.000Z',
}

describe('archivioDelCane', () => {
  it('attivo non si riattiva, non più in cura sì, deceduto non si sceglie', () => {
    expect(archivioDelCane('attivo')).toBe(false)
    expect(archivioDelCane(undefined)).toBe(false)
    expect(archivioDelCane('non_in_cura')).toBe(true)
    expect(archivioDelCane('deceduto')).toBeNull()
  })

  it('solo non_in_cura porta il piano a riattivare', () => {
    const adesso = new Date('2026-10-28T08:00:00.000Z')
    const piano = pianoRichiesta({ richiesta, comando: { azione: 'confermaCliente' }, token: 't', adesso, orarioLibero: false, animaleArchivio: archivioDelCane('non_in_cura') === true })
    expect(piano.ok && piano.cane).toBe('riattiva')
  })
})
