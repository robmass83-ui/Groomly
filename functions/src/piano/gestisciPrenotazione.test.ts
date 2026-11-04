import { describe, expect, it } from 'vitest'
import { pianoRichiesta, serviziDellaRichiesta, type RichiestaDoc } from '../../../src/lib/pianoRichiesta'
import { archivioDelCane, leggiRichiesta, linkRisposta, orariMailProposta } from './gestisciPrenotazione'

const richiesta: RichiestaDoc = {
  status: 'proposta', token: 't', nome: 'Ada', phone: '333', email: 'a@b.it', cane: 'Fido', razza: 'Meticcio',
  specie: 'cane', taglia: 'media', foto: [], start: '2026-10-28T09:00:00.000Z', end: '2026-10-28T10:00:00.000Z',
  sceltaAnimale: 'dog1', appointmentId: 'app1', scadeIl: '2026-10-28T12:00:00.000Z',
}

describe('voci della richiesta', () => {
  it('tiene servizi, minuti e prezzi scelti online e scarta una riga illeggibile', () => {
    const letta = leggiRichiesta({
      status: 'nuova',
      token: 't',
      nome: 'Ada',
      phone: '333',
      email: 'a@b.it',
      cane: 'Fido',
      razza: 'Meticcio',
      specie: 'cane',
      taglia: 'media',
      foto: [],
      start: '2026-10-28T08:00:00.000Z',
      end: '2026-10-28T10:00:00.000Z',
      durataMin: 120,
      voci: [
        { id: 'bagno', nome: 'Bagno', kind: 'principale', minuti: 90, prezzo: 35 },
        { id: 'nodi', nome: 'Nodi', kind: 'extra', minuti: 30, prezzo: 8 },
        { id: 'rotta', nome: '', minuti: 10, prezzo: 1 },
      ],
    })
    expect(letta?.voci).toEqual([
      { id: 'bagno', nome: 'Bagno', kind: 'principale', minuti: 90, prezzo: 35 },
      { id: 'nodi', nome: 'Nodi', kind: 'extra', minuti: 30, prezzo: 8 },
    ])
    expect(serviziDellaRichiesta(letta?.voci)).toEqual([
      { serviceId: 'bagno', name: 'Bagno', durationMin: 90, price: 35 },
      { serviceId: 'nodi', name: 'Nodi', durationMin: 30, price: 8 },
    ])
    expect(serviziDellaRichiesta(undefined)).toEqual([
      { serviceId: 'prenotazione', name: 'Toelettatura', durationMin: 60, price: 0 },
    ])
  })
})

describe('archivioDelCane', () => {
  it('attivo non si riattiva, non più in cura sì, deceduto non si sceglie', () => {
    expect(archivioDelCane('attivo')).toBe(false)
    expect(archivioDelCane(undefined)).toBe(false)
    expect(archivioDelCane('non_in_cura')).toBe(true)
    expect(archivioDelCane('deceduto')).toBeNull()
  })

  it('la proposta dice l’orario nuovo, quello chiesto e l’ora limite, a Roma', () => {
    const inizio = '2026-10-29T09:00:00.000Z'
    const fine = '2026-10-29T10:00:00.000Z'
    const chiesto = '2026-10-28T16:00:00.000Z'
    const scadeIl = '2026-10-28T21:15:00.000Z'
    expect(orariMailProposta('it', inizio, fine, chiesto, scadeIl)).toEqual({
      quando: 'giovedì 29 ottobre, 10:00–11:00',
      invece: 'mercoledì 28 ottobre alle 17:00',
      entro: 'le 22:15',
    })
    expect(orariMailProposta('en', inizio, fine, chiesto, scadeIl)).toEqual({
      quando: 'Thursday 29 October, 10:00–11:00',
      invece: 'Wednesday 28 October at 17:00',
      entro: '22:15',
    })
    expect(orariMailProposta('es', inizio, fine, chiesto, scadeIl)).toEqual({
      quando: 'jueves 29 de octubre, 10:00–11:00',
      invece: 'miércoles 28 de octubre a las 17:00',
      entro: 'las 22:15',
    })
    expect(orariMailProposta('it', 'no', fine, chiesto, scadeIl)).toBeNull()
  })

  it('solo non_in_cura porta il piano a riattivare', () => {
    const adesso = new Date('2026-10-28T08:00:00.000Z')
    const piano = pianoRichiesta({ richiesta, comando: { azione: 'confermaCliente' }, token: 't', adesso, orarioLibero: false, animaleArchivio: archivioDelCane('non_in_cura') === true })
    expect(piano.ok && piano.cane).toBe('riattiva')
  })
})

describe('lingua della richiesta', () => {
  it('si legge se valida, un valore sconosciuto sparisce', () => {
    const doc = { status: 'nuova', token: 't', nome: 'Ada', email: 'a@b.it', start: '2026-10-28T08:00:00.000Z', end: '2026-10-28T09:00:00.000Z' }
    expect(leggiRichiesta({ ...doc, lingua: 'de' })?.lingua).toBe('de')
    expect(leggiRichiesta({ ...doc, lingua: 'pt' })).not.toHaveProperty('lingua')
  })

  it('il link di risposta porta la lingua e gli orari la seguono', () => {
    expect(linkRisposta('s', 'i', 't', 'conferma', 'de')).toContain('lang=de')
    expect(linkRisposta('s', 'i', 't', 'conferma')).not.toContain('lang=')
    const orari = orariMailProposta('de', '2026-11-04T09:00:00.000Z', '2026-11-04T10:00:00.000Z', '2026-11-03T16:00:00.000Z', '2026-11-03T17:00:00.000Z')
    expect(orari).toEqual({ quando: 'Mittwoch, 4. November, 10:00\u201311:00', invece: 'Dienstag, 3. November um 17:00', entro: '18:00 Uhr' })
    expect(orariMailProposta('fr', '2026-11-04T09:00:00.000Z', '2026-11-04T10:00:00.000Z', '2026-11-03T16:00:00.000Z', '2026-11-03T17:00:00.000Z')?.invece).toBe('mardi 3 novembre à 17:00')
  })
})
