import { describe, expect, it } from 'vitest'
import type { BucoAttesa, IscrittoAttesa } from '../../../src/lib/listaAttesa'
import { idOfferta } from '../../../src/lib/listaAttesa'
import { offerteDaCreare } from './offerteAttesa'

function iscritto(id: string): IscrittoAttesa {
  return {
    id,
    nome: 'Mario',
    phone: '+3900000000',
    email: 'm@example.com',
    nomeCane: 'Rex',
    specie: 'cane',
    taglia: 'media',
    servizioId: 'bagno',
    trattamento: 'Bagno',
    durataMin: 60,
    creatoIl: '2026-11-01T10:00:00.000Z',
  }
}

function buco(appointmentId: string, inizioIso: string): BucoAttesa {
  return {
    appointmentId,
    inizio: new Date(inizioIso),
    nomeCaneDisdetto: 'Luna',
  }
}

describe('offerteDaCreare', () => {
  const adessoPrimaDelleDieci = new Date('2026-11-04T08:00:00.000Z')
  const inizioDieciRoma = '2026-11-04T09:00:00.000Z'
  const inizioSediciRoma = '2026-11-04T15:00:00.000Z'

  it('due iscritti e una disdetta alle 10 ancora futura: due offerte con id attesa', () => {
    const appointmentId = 'visita-1'
    const iscritti = [iscritto('i1'), iscritto('i2')]
    const buchi = [buco(appointmentId, inizioDieciRoma)]

    expect(offerteDaCreare({
      buchi,
      iscritti,
      esistenti: [],
      adesso: adessoPrimaDelleDieci,
    })).toEqual([
      {
        id: idOfferta(appointmentId, 'i1'),
        appointmentId,
        iscrittoId: 'i1',
        inizio: inizioDieciRoma,
      },
      {
        id: idOfferta(appointmentId, 'i2'),
        appointmentId,
        iscrittoId: 'i2',
        inizio: inizioDieciRoma,
      },
    ])
  })

  it('disdetta alle 16 con adesso alle 16: nessuna offerta', () => {
    const adesso = new Date('2026-11-04T15:00:00.000Z')
    expect(offerteDaCreare({
      buchi: [buco('visita-1', inizioSediciRoma)],
      iscritti: [iscritto('i1')],
      esistenti: [],
      adesso,
    })).toEqual([])
  })

  it('buco con inizio già passato rispetto ad adesso: nessuna offerta', () => {
    const adesso = new Date('2026-11-04T15:00:00.000Z')
    expect(offerteDaCreare({
      buchi: [buco('visita-1', inizioDieciRoma)],
      iscritti: [iscritto('i1')],
      esistenti: [],
      adesso,
    })).toEqual([])
  })

  it('salta le offerte già in esistenti, emette le altre se l’ora è ancora davanti', () => {
    const appointmentId = 'visita-1'
    const idGia = idOfferta(appointmentId, 'i1')
    expect(offerteDaCreare({
      buchi: [buco(appointmentId, inizioDieciRoma)],
      iscritti: [iscritto('i1'), iscritto('i2')],
      esistenti: [{ id: idGia }],
      adesso: adessoPrimaDelleDieci,
    })).toEqual([
      {
        id: idOfferta(appointmentId, 'i2'),
        appointmentId,
        iscrittoId: 'i2',
        inizio: inizioDieciRoma,
      },
    ])
  })

  it('ordine stabile: buchi e iscritti come ricevuti', () => {
    const b1 = buco('apt-a', inizioDieciRoma)
    const b2 = buco('apt-b', inizioDieciRoma)
    const iscritti = [iscritto('x'), iscritto('y')]
    const out = offerteDaCreare({
      buchi: [b1, b2],
      iscritti,
      esistenti: [],
      adesso: adessoPrimaDelleDieci,
    })
    expect(out.map((r) => r.id)).toEqual([
      idOfferta('apt-a', 'x'),
      idOfferta('apt-a', 'y'),
      idOfferta('apt-b', 'x'),
      idOfferta('apt-b', 'y'),
    ])
  })
})
