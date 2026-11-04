import { describe, expect, it } from 'vitest'
import { eventoRcDi, pianoDaEvento, salonIdDiEvento, type EventoRc } from './eventoRc'

const ADESSO = new Date('2026-12-01T10:00:00.000Z')
const GIORNO = 24 * 60 * 60 * 1000
const FRA30 = ADESSO.getTime() + 30 * GIORNO

function evento(parziale: Partial<EventoRc>): EventoRc {
  return {
    id: 'e1',
    type: 'INITIAL_PURCHASE',
    app_user_id: 'salone1',
    product_id: 'groomly_plus:mensile',
    expiration_at_ms: FRA30,
    event_timestamp_ms: ADESSO.getTime(),
    environment: 'SANDBOX',
    ...parziale,
  }
}

function campi(e: EventoRc, attuale?: Parameters<typeof pianoDaEvento>[1]) {
  const esito = pianoDaEvento(e, attuale, ADESSO)
  if (esito.azione !== 'scrivi') throw new Error(`ignorato: ${esito.motivo}`)
  return esito.campi
}

describe('pianoDaEvento', () => {
  it('acquisto Plus mensile: attivo da Play fino alla scadenza, con rinnovo', () => {
    expect(campi(evento({}))).toMatchObject({
      piano: 'pro', stato: 'attivo', fonte: 'play', scadeIl: new Date(FRA30).toISOString(), rinnovoAutomatico: true, seatsIncluded: 0,
    })
  })

  it('Salone (anche senza piano base nel nome) con 3 posti inclusi', () => {
    expect(campi(evento({ product_id: 'groomly_salone' }))).toMatchObject({ piano: 'salone', seatsIncluded: 3, fonte: 'play' })
  })

  it('rinnovo, ripresa e cambio prodotto riattivano; il cambio usa il nuovo prodotto', () => {
    expect(campi(evento({ type: 'RENEWAL' })).stato).toBe('attivo')
    expect(campi(evento({ type: 'UNCANCELLATION' })).stato).toBe('attivo')
    expect(campi(evento({ type: 'SUBSCRIPTION_EXTENDED' })).stato).toBe('attivo')
    expect(campi(evento({ type: 'PRODUCT_CHANGE', new_product_id: 'groomly_salone:mensile' })).piano).toBe('salone')
  })

  it('disdetta: resta attivo fino alla data, senza rinnovo', () => {
    expect(campi(evento({ type: 'CANCELLATION' }))).toMatchObject({ stato: 'disdetto', rinnovoAutomatico: false, scadeIl: new Date(FRA30).toISOString() })
  })

  it('problema di pagamento: grazia fino alla fine della tolleranza', () => {
    const grazia = ADESSO.getTime() + 7 * GIORNO
    expect(campi(evento({ type: 'BILLING_ISSUE', grace_period_expiration_at_ms: grazia }))).toMatchObject({ stato: 'grazia', scadeIl: new Date(grazia).toISOString() })
    expect(campi(evento({ type: 'BILLING_ISSUE', grace_period_expiration_at_ms: null })).scadeIl).toBe(new Date(FRA30).toISOString())
  })

  it('scadenza: torna a Go solo se il piano era di Play', () => {
    expect(campi(evento({ type: 'EXPIRATION' }), { piano: 'pro', stato: 'disdetto', fonte: 'play' })).toMatchObject({ piano: 'base', fonte: null, provaUsata: true })
    expect(pianoDaEvento(evento({ type: 'EXPIRATION' }), { piano: 'pro', stato: 'attivo', fonte: 'beta' }, ADESSO).azione).toBe('ignora')
  })

  it('ignora prova, trasferimenti, posti extra e prodotti sconosciuti', () => {
    for (const e of [
      evento({ type: 'TEST' }),
      evento({ type: 'TRANSFER' }),
      evento({ type: 'SUBSCRIPTION_PAUSED' }),
      evento({ product_id: 'groomly_posto_extra:mensile' }),
      evento({ product_id: 'altro:mensile' }),
      evento({ expiration_at_ms: null }),
    ]) expect(pianoDaEvento(e, undefined, ADESSO).azione).toBe('ignora')
  })

  it('i VIP restano VIP', () => {
    expect(pianoDaEvento(evento({}), { piano: 'salone', stato: 'attivo', fonte: 'omaggio', scadeIl: null }, ADESSO).azione).toBe('ignora')
  })

  it('un evento più vecchio dell’ultimo applicato non torna indietro', () => {
    const attuale = { piano: 'pro' as const, stato: 'attivo' as const, fonte: 'play' as const, rcEventoMs: ADESSO.getTime() }
    expect(pianoDaEvento(evento({ type: 'CANCELLATION', event_timestamp_ms: ADESSO.getTime() - 1000 }), attuale, ADESSO).azione).toBe('ignora')
    expect(pianoDaEvento(evento({ type: 'CANCELLATION', event_timestamp_ms: ADESSO.getTime() + 1000 }), attuale, ADESSO)).toMatchObject({ azione: 'scrivi', ms: ADESSO.getTime() + 1000 })
  })
})

describe('salonIdDiEvento', () => {
  it('usa app_user_id, o il primo alias non anonimo', () => {
    expect(salonIdDiEvento(evento({}))).toBe('salone1')
    expect(salonIdDiEvento(evento({ app_user_id: '$RCAnonymousID:abc', aliases: ['$RCAnonymousID:abc', 'salone2'] }))).toBe('salone2')
  })

  it('mai shared, percorsi o vuoti', () => {
    expect(salonIdDiEvento(evento({ app_user_id: 'shared' }))).toBeNull()
    expect(salonIdDiEvento(evento({ app_user_id: 'a/b' }))).toBeNull()
    expect(salonIdDiEvento(evento({ app_user_id: '$RCAnonymousID:x', aliases: [] }))).toBeNull()
    expect(salonIdDiEvento(evento({ app_user_id: undefined }))).toBeNull()
  })
})

describe('eventoRcDi', () => {
  it('legge event dal corpo del webhook, scarta il resto', () => {
    expect(eventoRcDi({ event: { id: 'x', type: 'RENEWAL', app_user_id: 's', expiration_at_ms: 5 } })).toMatchObject({ id: 'x', type: 'RENEWAL', expiration_at_ms: 5 })
    expect(eventoRcDi({ event: { type: 'RENEWAL' } })).toBeNull()
    expect(eventoRcDi(null)).toBeNull()
  })
})
