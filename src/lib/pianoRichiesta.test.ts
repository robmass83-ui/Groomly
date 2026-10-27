import { describe, expect, it } from 'vitest'
import { istanteRoma } from './disponibilita'
import { pianoRichiesta, type ComandoRichiesta, type RichiestaDoc } from './pianoRichiesta'

const adesso = istanteRoma('2026-10-28', '09:00')
const futuro = istanteRoma('2026-10-28', '12:00').toISOString()
const passato = istanteRoma('2026-10-28', '08:00').toISOString()
const propostaAlle10 = {
  inizio: istanteRoma('2026-10-29', '10:00').toISOString(),
  fine: new Date(istanteRoma('2026-10-29', '10:00').getTime() + 60 * 60 * 1000).toISOString(),
  scadeIl: istanteRoma('2026-10-28', '10:00').toISOString(),
}

function richiesta(extra: Partial<RichiestaDoc> = {}): RichiestaDoc {
  return {
    status: 'nuova',
    token: 'tok-1',
    nome: 'Mario Rossi',
    phone: '3493053622',
    email: 'mario@email.it',
    cane: 'Birba',
    razza: 'Meticcio',
    specie: 'cane',
    taglia: 'media',
    foto: [],
    start: istanteRoma('2026-10-28', '17:00').toISOString(),
    end: istanteRoma('2026-10-28', '18:00').toISOString(),
    ...extra,
  }
}

function esegui(
  comando: ComandoRichiesta,
  extra: {
    richiesta?: RichiestaDoc
    token?: string
    orarioLibero?: boolean
    animaleArchivio?: boolean
  } = {},
) {
  return pianoRichiesta({
    richiesta: extra.richiesta ?? richiesta(),
    comando,
    token: extra.token ?? 'tok-1',
    adesso,
    orarioLibero: extra.orarioLibero ?? true,
    animaleArchivio: extra.animaleArchivio ?? false,
  })
}

function proposta(extra: Partial<RichiestaDoc> = {}): RichiestaDoc {
  return richiesta({ status: 'proposta', sceltaAnimale: 'nuovo', scadeIl: futuro, appointmentId: 'app-1', ...extra })
}

describe('piano della richiesta', () => {
  it('accetta senza scelta è un errore di scelta', () => {
    expect(esegui({ azione: 'accetta' } as ComandoRichiesta)).toEqual({ ok: false, errore: 'scelta' })
    expect(esegui({ azione: 'accetta', scelta: { tipo: 'esistente', dogId: '' } })).toEqual({ ok: false, errore: 'scelta' })
  })

  it('accetta un animale nuovo e crea appuntamento, profilo e mail di conferma', () => {
    expect(esegui({ azione: 'accetta', scelta: { tipo: 'nuovo' } }, { animaleArchivio: true })).toEqual({
      ok: true,
      richiesta: { status: 'accettata', sceltaAnimale: 'nuovo' },
      appuntamento: 'crea',
      cane: 'crea',
      mail: 'conferma',
    })
  })

  it('accetta un id archiviato e riattiva il profilo senza crearne uno', () => {
    expect(esegui({ azione: 'accetta', scelta: { tipo: 'esistente', dogId: 'old' } }, { animaleArchivio: true })).toEqual({
      ok: true,
      richiesta: { status: 'accettata', sceltaAnimale: 'old' },
      appuntamento: 'crea',
      cane: 'riattiva',
      mail: 'conferma',
    })
  })

  it('accetta un id già in cura senza toccare il profilo', () => {
    expect(esegui({ azione: 'accetta', scelta: { tipo: 'esistente', dogId: 'rex' } })).toEqual({
      ok: true,
      richiesta: { status: 'accettata', sceltaAnimale: 'rex' },
      appuntamento: 'crea',
      cane: 'niente',
      mail: 'conferma',
    })
  })

  it('accetta anche se l’orario non è libero', () => {
    const esito = esegui({ azione: 'accetta', scelta: { tipo: 'nuovo' } }, { orarioLibero: false })
    expect(esito).toMatchObject({ ok: true, appuntamento: 'crea', cane: 'crea', mail: 'conferma' })
    expect(esito).not.toHaveProperty('scadeIl')
  })

  it('proponi alle 10 del 29 crea la proposta senza il profilo e scade un’ora dopo adesso', () => {
    expect(esegui({
      azione: 'proponi',
      scelta: { tipo: 'nuovo' },
      giorno: '2026-10-29',
      ora: '10:00',
    })).toEqual({
      ok: true,
      richiesta: { status: 'proposta', sceltaAnimale: 'nuovo', scadeIl: propostaAlle10.scadeIl },
      appuntamento: 'crea',
      cane: 'niente',
      mail: 'proposta',
      scadeIl: propostaAlle10.scadeIl,
      inizio: propostaAlle10.inizio,
      fine: propostaAlle10.fine,
    })
  })

  it('proponi un id archiviato non riattiva e non crea il profilo', () => {
    const esito = esegui(
      { azione: 'proponi', scelta: { tipo: 'esistente', dogId: 'old' }, giorno: '2026-10-29', ora: '10:00' },
      { animaleArchivio: true },
    )
    expect(esito).toMatchObject({
      ok: true,
      richiesta: { status: 'proposta', sceltaAnimale: 'old' },
      appuntamento: 'crea',
      cane: 'niente',
      mail: 'proposta',
    })
  })

  it('proponi su un orario non libero è un errore di orario', () => {
    expect(esegui(
      { azione: 'proponi', scelta: { tipo: 'nuovo' }, giorno: '2026-10-29', ora: '10:00' },
      { orarioLibero: false },
    )).toEqual({ ok: false, errore: 'orario' })
  })

  it('proponi su un’ora già passata è un errore di orario', () => {
    expect(esegui({ azione: 'proponi', scelta: { tipo: 'nuovo' }, giorno: '2026-10-28', ora: '08:00' })).toEqual({
      ok: false,
      errore: 'orario',
    })
  })

  it('rifiuta da nuova non crea nulla e manda il rifiuto', () => {
    expect(esegui({ azione: 'rifiuta' }, { orarioLibero: false, animaleArchivio: true })).toEqual({
      ok: true,
      richiesta: { status: 'rifiutata' },
      appuntamento: 'niente',
      cane: 'niente',
      mail: 'rifiuto',
    })
  })

  it('il cliente conferma un animale nuovo prima della scadenza', () => {
    expect(esegui({ azione: 'confermaCliente' }, { richiesta: proposta(), token: 'tok-1' })).toEqual({
      ok: true,
      richiesta: { status: 'accettata' },
      appuntamento: 'conferma',
      cane: 'crea',
      mail: 'nessuna',
    })
  })

  it('il cliente conferma un id archiviato e lo riattiva', () => {
    expect(esegui(
      { azione: 'confermaCliente' },
      { richiesta: proposta({ sceltaAnimale: 'old' }), token: 'tok-1', animaleArchivio: true },
    )).toEqual({
      ok: true,
      richiesta: { status: 'accettata' },
      appuntamento: 'conferma',
      cane: 'riattiva',
      mail: 'nessuna',
    })
  })

  it('il cliente conferma un id già in cura senza toccare il profilo', () => {
    expect(esegui(
      { azione: 'confermaCliente' },
      { richiesta: proposta({ sceltaAnimale: 'rex' }), token: 'tok-1' },
    )).toEqual({
      ok: true,
      richiesta: { status: 'accettata' },
      appuntamento: 'conferma',
      cane: 'niente',
      mail: 'nessuna',
    })
  })

  it('confermaCliente con token vuoto o diverso non cambia lo stato', () => {
    const aperta = proposta()
    expect(esegui({ azione: 'confermaCliente' }, { richiesta: aperta, token: '' })).toEqual({ ok: false, errore: 'token' })
    expect(esegui({ azione: 'confermaCliente' }, { richiesta: aperta, token: 'altro' })).toEqual({ ok: false, errore: 'token' })
    expect(esegui(
      { azione: 'confermaCliente' },
      { richiesta: proposta({ token: '', scadeIl: passato }), token: '' },
    )).toEqual({ ok: false, errore: 'token' })
  })

  it('rifiutaCliente con token vuoto o diverso non scrive', () => {
    expect(esegui({ azione: 'rifiutaCliente' }, { richiesta: proposta(), token: '' })).toEqual({ ok: false, errore: 'token' })
    expect(esegui({ azione: 'rifiutaCliente' }, { richiesta: proposta(), token: 'altro' })).toEqual({ ok: false, errore: 'token' })
  })

  it('confermaCliente e rifiutaCliente con scadenza passata o assente non scrivono', () => {
    expect(esegui({ azione: 'confermaCliente' }, { richiesta: proposta({ scadeIl: passato }), token: 'tok-1' })).toEqual({
      ok: false,
      errore: 'scaduta',
    })
    expect(esegui({ azione: 'confermaCliente' }, { richiesta: proposta({ scadeIl: undefined }), token: 'tok-1' })).toEqual({
      ok: false,
      errore: 'scaduta',
    })
    expect(esegui({ azione: 'rifiutaCliente' }, { richiesta: proposta({ scadeIl: passato }), token: 'tok-1' })).toEqual({
      ok: false,
      errore: 'scaduta',
    })
    expect(esegui({ azione: 'rifiutaCliente' }, { richiesta: proposta({ scadeIl: undefined }), token: 'tok-1' })).toEqual({
      ok: false,
      errore: 'scaduta',
    })
  })

  it('un token sbagliato conta prima della scadenza', () => {
    expect(esegui(
      { azione: 'confermaCliente' },
      { richiesta: proposta({ scadeIl: passato }), token: 'altro' },
    )).toEqual({ ok: false, errore: 'token' })
  })

  it('rifiutaCliente annulla la proposta e scade la chiude senza il profilo', () => {
    expect(esegui(
      { azione: 'rifiutaCliente' },
      { richiesta: proposta({ sceltaAnimale: 'old' }), token: 'tok-1', animaleArchivio: true },
    )).toEqual({
      ok: true,
      richiesta: { status: 'rifiutata' },
      appuntamento: 'cancella',
      cane: 'niente',
      mail: 'rifiuto',
    })
    expect(esegui(
      { azione: 'scade' },
      { richiesta: proposta({ sceltaAnimale: 'old', scadeIl: passato, token: 'segreto' }), token: '', animaleArchivio: true },
    )).toEqual({
      ok: true,
      richiesta: { status: 'scaduta' },
      appuntamento: 'cancella',
      cane: 'niente',
      mail: 'scadenza',
    })
  })

  it('un secondo confermaCliente su una richiesta già accettata è un errore di stato', () => {
    expect(esegui(
      { azione: 'confermaCliente' },
      { richiesta: richiesta({ status: 'accettata', sceltaAnimale: 'nuovo', scadeIl: futuro }), token: 'tok-1' },
    )).toEqual({ ok: false, errore: 'stato' })
  })

  it('accetta, proponi e rifiuta partono solo da nuova', () => {
    const giaProposta = proposta()
    expect(esegui({ azione: 'accetta', scelta: { tipo: 'nuovo' } }, { richiesta: giaProposta, token: 'tok-1' })).toEqual({
      ok: false,
      errore: 'stato',
    })
    expect(esegui(
      { azione: 'proponi', scelta: { tipo: 'nuovo' }, giorno: '2026-10-29', ora: '10:00' },
      { richiesta: giaProposta, token: 'tok-1' },
    )).toEqual({ ok: false, errore: 'stato' })
    expect(esegui({ azione: 'rifiuta' }, { richiesta: giaProposta, token: 'tok-1' })).toEqual({ ok: false, errore: 'stato' })
    expect(esegui({ azione: 'rifiuta' }, { richiesta: richiesta({ status: 'rifiutata' }) })).toEqual({ ok: false, errore: 'stato' })
  })

  it('confermaCliente, rifiutaCliente e scade partono solo da proposta', () => {
    expect(esegui({ azione: 'confermaCliente' }, { token: 'tok-1' })).toEqual({ ok: false, errore: 'stato' })
    expect(esegui({ azione: 'rifiutaCliente' }, { token: 'tok-1' })).toEqual({ ok: false, errore: 'stato' })
    expect(esegui({ azione: 'scade' }, { token: '' })).toEqual({ ok: false, errore: 'stato' })
    expect(esegui({ azione: 'scade' }, { richiesta: richiesta({ status: 'scaduta', scadeIl: passato }), token: '' })).toEqual({
      ok: false,
      errore: 'stato',
    })
  })
})
