import { describe, expect, it } from 'vitest'
import { eventoRcDi, idRcDiEvento, pianoDaEvento, type EventoRc } from './eventoRc'

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

describe('idRcDiEvento', () => {
  const uno = `g_${'a'.repeat(32)}`
  const due = `g_${'b'.repeat(32)}`

  it('prende app_user_id e poi gli alias, solo se sono id dati dal server', () => {
    expect(idRcDiEvento(evento({ app_user_id: uno }))).toEqual([uno])
    expect(idRcDiEvento(evento({ app_user_id: '$RCAnonymousID:abc', aliases: ['$RCAnonymousID:abc', due] }))).toEqual([due])
  })

  it('un salonId nudo, shared, percorsi o vuoti non contano', () => {
    for (const id of ['salone1', 'shared', 'a/b', '$RCAnonymousID:x', undefined, 'g_corto']) {
      expect(idRcDiEvento(evento({ app_user_id: id, aliases: [] }))).toEqual([])
    }
  })
})

describe('due abbonamenti Play insieme', () => {
  const salonAttivo = {
    piano: 'salone' as const, stato: 'attivo' as const, fonte: 'play' as const,
    scadeIl: new Date(ADESSO.getTime() + 20 * 86_400_000).toISOString(), rcProdotto: 'groomly_salone:mensile',
  }

  it('scadenza, disdetta, rinnovo e problemi del vecchio Plus non toccano il Salon pagato', () => {
    for (const type of ['EXPIRATION', 'CANCELLATION', 'RENEWAL', 'UNCANCELLATION', 'BILLING_ISSUE']) {
      expect(pianoDaEvento(evento({ type, product_id: 'groomly_plus:mensile' }), salonAttivo, ADESSO), type).toEqual({ azione: 'ignora', motivo: 'altro-abbonamento' })
    }
  })

  it('un prodotto che non è un piano non chiude mai il salone, nemmeno alla scadenza', () => {
    expect(pianoDaEvento(evento({ type: 'EXPIRATION', product_id: 'groomly_posto_extra:mensile' }), salonAttivo, ADESSO).azione).toBe('ignora')
  })

  it('il passaggio da Plus a Salon e l’acquisto di un livello più alto passano sempre', () => {
    const plusAttivo = { ...salonAttivo, piano: 'pro' as const, rcProdotto: 'groomly_plus:mensile' }
    expect(pianoDaEvento(evento({ type: 'PRODUCT_CHANGE', product_id: 'groomly_plus:mensile', new_product_id: 'groomly_salone:mensile' }), plusAttivo, ADESSO))
      .toMatchObject({ azione: 'scrivi', campi: { piano: 'salone' }, prodotto: 'groomly_salone:mensile' })
    expect(pianoDaEvento(evento({ type: 'INITIAL_PURCHASE', product_id: 'groomly_salone:mensile' }), plusAttivo, ADESSO))
      .toMatchObject({ azione: 'scrivi', campi: { piano: 'salone' } })
  })

  it('la scadenza del prodotto che regge il piano lo chiude e toglie rcProdotto', () => {
    expect(pianoDaEvento(evento({ type: 'EXPIRATION', product_id: 'groomly_salone:mensile' }), salonAttivo, ADESSO))
      .toMatchObject({ azione: 'scrivi', campi: { piano: 'base' }, prodotto: null })
  })

  it('senza rcProdotto (documenti di prima) si comporta come prima', () => {
    const { rcProdotto: _tolto, ...vecchio } = salonAttivo
    expect(pianoDaEvento(evento({ type: 'EXPIRATION', product_id: 'groomly_plus:mensile' }), vecchio, ADESSO)).toMatchObject({ azione: 'scrivi', campi: { piano: 'base' } })
  })

  it('a piano già scaduto anche l’altro abbonamento vale', () => {
    const scaduto = { ...salonAttivo, scadeIl: new Date(ADESSO.getTime() - 1000).toISOString() }
    expect(pianoDaEvento(evento({ type: 'RENEWAL', product_id: 'groomly_plus:mensile' }), scaduto, ADESSO)).toMatchObject({ azione: 'scrivi', campi: { piano: 'pro' } })
  })
})

describe('eventoRcDi', () => {
  it('legge event dal corpo del webhook, scarta il resto', () => {
    expect(eventoRcDi({ event: { id: 'x', type: 'RENEWAL', app_user_id: 's', expiration_at_ms: 5 } })).toMatchObject({ id: 'x', type: 'RENEWAL', expiration_at_ms: 5 })
    expect(eventoRcDi({ event: { type: 'RENEWAL' } })).toBeNull()
    expect(eventoRcDi(null)).toBeNull()
  })
})
