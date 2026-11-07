import { beforeEach, describe, expect, it, vi } from 'vitest'

const { archivio } = vi.hoisted(() => ({ archivio: new Map<string, Record<string, unknown>>() }))
vi.mock('firebase-admin/firestore', async () => (await import('../piano/firestoreFinto.testutil')).firestoreFinto(archivio))

import { campiBeta, scriviPiano, tracciaBeta } from '../piano/scriviPiano'
import { applicaEventoRc, idAcquistiPer } from './applicaEventoRc'
import { getFirestore } from 'firebase-admin/firestore'

const GIORNO = 24 * 60 * 60 * 1000
const T0 = new Date('2026-12-01T10:00:00.000Z')

let n = 0
// L'id che il server ha dato a salone1 per RevenueCat (vedi beforeEach).
let ID1 = ''
function corpo(type: string, extra: Record<string, unknown> = {}, quando = T0) {
  n += 1
  return {
    event: {
      id: `e${n}`,
      type,
      app_user_id: ID1,
      product_id: 'groomly_salone:mensile',
      expiration_at_ms: quando.getTime() + 30 * GIORNO,
      event_timestamp_ms: quando.getTime(),
      environment: 'SANDBOX',
      ...extra,
    },
  }
}

const piano = () => archivio.get('salons/salone1/pro/main') as Record<string, unknown>

describe('applicaEventoRc', () => {
  beforeEach(async () => {
    archivio.clear()
    n = 0
    ID1 = await idAcquistiPer('salone1', getFirestore())
  })

  it('un salone in beta che compra passa a Play senza buchi e tiene la traccia beta', async () => {
    const beta = campiBeta('salone', 60, T0)
    archivio.set('salons/salone1/pro/main', { ...scriviPiano(beta, T0), ...tracciaBeta('salone', T0, beta.scadeIl as string) })
    expect(await applicaEventoRc(corpo('INITIAL_PURCHASE'), T0)).toEqual({ scritto: true })
    expect(piano()).toMatchObject({
      piano: 'salone', stato: 'attivo', fonte: 'play', enabled: true, seats: 3, rinnovoAutomatico: true,
      exBeta: true, earlyAdopter: true, betaPiano: 'salone', rcAmbiente: 'SANDBOX', rcEventoMs: T0.getTime(),
    })
  })

  it('acquisto, rinnovo, pagamento non riuscito, disdetta e scadenza', async () => {
    const t = (giorni: number) => new Date(T0.getTime() + giorni * GIORNO)
    await applicaEventoRc(corpo('INITIAL_PURCHASE', {}, t(0)), t(0))
    await applicaEventoRc(corpo('RENEWAL', {}, t(30)), t(30))
    expect(piano()).toMatchObject({ stato: 'attivo', scadeIl: new Date(t(60).getTime()).toISOString() })
    await applicaEventoRc(corpo('BILLING_ISSUE', { grace_period_expiration_at_ms: t(67).getTime() }, t(60)), t(60))
    expect(piano()).toMatchObject({ stato: 'grazia', enabled: true })
    await applicaEventoRc(corpo('CANCELLATION', {}, t(61)), t(61))
    expect(piano()).toMatchObject({ stato: 'disdetto', rinnovoAutomatico: false, enabled: true })
    await applicaEventoRc(corpo('EXPIRATION', {}, t(91)), t(91))
    expect(piano()).toMatchObject({ piano: 'base', stato: 'scaduto', fonte: null, enabled: false, seats: 0, provaUsata: true })
  })

  it('ogni evento autenticato aggiorna lo stato del webhook; TEST non tocca i piani', async () => {
    expect(await applicaEventoRc(corpo('TEST'), T0)).toEqual({ scritto: false, motivo: 'TEST' })
    expect(archivio.get('rcStato/webhook')).toEqual({ ultimoEventoIl: T0.toISOString(), tipo: 'TEST', ambiente: 'SANDBOX' })
    expect(archivio.has('salons/salone1/pro/main')).toBe(false)
  })

  it('l’id per RevenueCat è casuale, uno per salone, e resta quello', async () => {
    expect(ID1).toMatch(/^g_[0-9a-f]{32}$/)
    expect(await idAcquistiPer('salone1', getFirestore())).toBe(ID1)
    const altro = await idAcquistiPer('salone2', getFirestore())
    expect(altro).not.toBe(ID1)
    expect(archivio.get(`rcUtenti/${altro}`)).toEqual({ salonId: 'salone2' })
  })

  it('un evento con il salonId nudo o con un id sconosciuto non scrive nessun piano', async () => {
    archivio.set('salons/vittima/pro/main', { piano: 'salone', stato: 'attivo', fonte: 'beta', enabled: true })
    const prima = structuredClone(archivio.get('salons/vittima/pro/main'))
    for (const id of ['vittima', `g_${'0'.repeat(32)}`]) {
      expect(await applicaEventoRc(corpo('INITIAL_PURCHASE', { app_user_id: id, product_id: 'groomly_plus:mensile' }), T0)).toEqual({ scritto: false, motivo: 'salone' })
    }
    expect(archivio.get('salons/vittima/pro/main')).toEqual(prima)
    expect([...archivio.keys()].filter((k) => k.endsWith('/pro/main'))).toEqual(['salons/vittima/pro/main'])
  })

  it('salva il prodotto che regge il piano e lo toglie alla scadenza', async () => {
    await applicaEventoRc(corpo('INITIAL_PURCHASE'), T0)
    expect(piano().rcProdotto).toBe('groomly_salone:mensile')
    await applicaEventoRc(corpo('EXPIRATION', {}, new Date(T0.getTime() + 31 * GIORNO)), new Date(T0.getTime() + 31 * GIORNO))
    expect(piano()).not.toHaveProperty('rcProdotto')
  })

  it('TRANSFER chiude il piano Play del salone di partenza', async () => {
    await applicaEventoRc(corpo('INITIAL_PURCHASE'), T0)
    const id2 = await idAcquistiPer('salone2', getFirestore())
    expect(await applicaEventoRc(corpo('TRANSFER', { app_user_id: undefined, transferred_from: [ID1], transferred_to: [id2] }), T0)).toEqual({ scritto: true })
    expect(piano()).toMatchObject({ piano: 'base', enabled: false })
    expect(piano()).not.toHaveProperty('rcProdotto')
  })

  it('un’offerta usata da un salone senza diritto finisce tra le segnalazioni, senza cambiare il piano', async () => {
    expect(await applicaEventoRc(corpo('INITIAL_PURCHASE', { offer_code: 'early-adopter', price: 4.99, currency: 'EUR' }), T0)).toEqual({ scritto: true })
    const segnalazioni = [...archivio.entries()].filter(([k]) => k.startsWith('rcSegnalazioni/')).map(([, v]) => v)
    expect(segnalazioni).toEqual([expect.objectContaining({ salonId: 'salone1', tipo: 'offerta-senza-diritto', offerta: 'early-adopter', prezzo: 4.99 })])
    archivio.set('salons/salone1/pro/main', { ...piano(), earlyAdopter: true })
    await applicaEventoRc(corpo('RENEWAL', { offer_code: 'early-adopter' }, new Date(T0.getTime() + GIORNO)), new Date(T0.getTime() + GIORNO))
    expect([...archivio.keys()].filter((k) => k.startsWith('rcSegnalazioni/'))).toHaveLength(1)
  })

  it('shared e corpi illeggibili non si scrivono mai', async () => {
    expect((await applicaEventoRc(corpo('INITIAL_PURCHASE', { app_user_id: 'shared' }), T0)).scritto).toBe(false)
    expect(archivio.has('salons/shared/pro/main')).toBe(false)
    expect(await applicaEventoRc({ niente: true }, T0)).toEqual({ scritto: false, motivo: 'evento' })
  })
})
