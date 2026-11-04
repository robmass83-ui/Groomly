import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import {
  avviaAcquisto,
  azzeraNegozio,
  compra,
  distribuzioneCorrente,
  esitoErrore,
  ripristinaAcquisti,
  sceltaAcquisto,
  sondaggioDisdettaVisibile,
  statoAcquisto,
  type NegozioAbbonamenti,
  type OfferingMinima,
} from './billing'

describe('acquisti spenti', () => {
  it('con gli abbonamenti spenti non carica lo store e nasconde il sondaggio', () => {
    const carica = vi.fn()
    expect(compra(false, carica)).toEqual({ stato: 'spento' })
    expect(carica).not.toHaveBeenCalled()
    expect(sondaggioDisdettaVisibile(false)).toBe(false)
  })
})

describe('statoAcquisto', () => {
  it('spento, solo da Play, senza chiave, pronto', () => {
    expect(statoAcquisto({ abbonamentiAttivi: false, distribuzione: 'play', chiaveSdk: 'goog_x' })).toBe('spento')
    expect(statoAcquisto({ abbonamentiAttivi: true, distribuzione: 'github', chiaveSdk: 'goog_x' })).toBe('solo-play')
    expect(statoAcquisto({ abbonamentiAttivi: true, distribuzione: 'web', chiaveSdk: 'goog_x' })).toBe('solo-play')
    expect(statoAcquisto({ abbonamentiAttivi: true, distribuzione: 'play', chiaveSdk: '  ' })).toBe('non-disponibile')
    expect(statoAcquisto({ abbonamentiAttivi: true, distribuzione: 'play', chiaveSdk: 'goog_x' })).toBe('pronto')
  })

  it('play solo con la variante play dentro l’app nativa', () => {
    window.__GROOMLY_DISTRIBUTION__ = 'play'
    expect(distribuzioneCorrente(true)).toBe('play')
    expect(distribuzioneCorrente(false)).toBe('web')
    window.__GROOMLY_DISTRIBUTION__ = 'github'
    expect(distribuzioneCorrente(true)).toBe('github')
    delete window.__GROOMLY_DISTRIBUTION__
  })
})

const early = { id: 'mensile:early-adopter', tags: ['early-adopter'] }
const base = { id: 'mensile', tags: [] }
function offering(opzioni = [base, early]): OfferingMinima {
  return {
    availablePackages: [
      { identifier: 'plus_mensile', product: { subscriptionOptions: opzioni } },
      { identifier: 'salone_mensile', product: { subscriptionOptions: [base] } },
    ],
  }
}

describe('sceltaAcquisto', () => {
  it('pacchetto mensile del piano; offerta early adopter solo a chi ne ha diritto', () => {
    expect(sceltaAcquisto(offering(), 'plus', false)).toMatchObject({ tipo: 'pacchetto', pacchetto: { identifier: 'plus_mensile' } })
    expect(sceltaAcquisto(offering(), 'plus', true)).toEqual({ tipo: 'opzione', opzione: early })
    expect(sceltaAcquisto(offering(), 'salone', true)).toMatchObject({ tipo: 'pacchetto', pacchetto: { identifier: 'salone_mensile' } })
    expect(sceltaAcquisto(offering([base, { id: 'early-adopter', tags: [] }]), 'plus', true)).toMatchObject({ tipo: 'opzione' })
    expect(sceltaAcquisto({ availablePackages: [] }, 'plus', false)).toBeNull()
  })
})

describe('esitoErrore', () => {
  it('annullato, non disponibile o errore', () => {
    expect(esitoErrore({ userCancelled: true })).toBe('annullato')
    expect(esitoErrore({ code: '1' })).toBe('annullato')
    expect(esitoErrore({ code: '23' })).toBe('non-disponibile')
    expect(esitoErrore({ code: '5' })).toBe('non-disponibile')
    expect(esitoErrore(new Error('boh'))).toBe('errore')
  })
})

describe('avviaAcquisto e ripristino', () => {
  let negozio: { [K in keyof NegozioAbbonamenti]: Mock<NegozioAbbonamenti[K]> }
  const carica = vi.fn(async () => negozio)
  const dati = (extra: Partial<Parameters<typeof avviaAcquisto>[0]> = {}) => ({
    abbonamentiAttivi: true,
    chiaveSdk: 'goog_x',
    offeringId: 'groomly_standard',
    salonId: 'salone1',
    distribuzione: 'play' as const,
    piano: 'plus' as const,
    earlyAdopter: false,
    negozio: carica,
    ...extra,
  })

  beforeEach(() => {
    azzeraNegozio()
    carica.mockClear()
    negozio = {
      configura: vi.fn(async () => undefined),
      collega: vi.fn(async () => undefined),
      offering: vi.fn(async () => offering()),
      compra: vi.fn(async () => 'ok' as const),
      ripristina: vi.fn(async () => undefined),
    }
  })

  it('spento o fuori da Play non carica nemmeno l’SDK', async () => {
    expect(await avviaAcquisto(dati({ abbonamentiAttivi: false }))).toBe('spento')
    expect(await avviaAcquisto(dati({ distribuzione: 'github' }))).toBe('solo-play')
    expect(await avviaAcquisto(dati({ chiaveSdk: '' }))).toBe('non-disponibile')
    expect(await avviaAcquisto(dati({ salonId: '' }))).toBe('non-disponibile')
    expect(carica).not.toHaveBeenCalled()
  })

  it('compra il pacchetto, configura una volta e collega il salone nuovo', async () => {
    expect(await avviaAcquisto(dati())).toBe('ok')
    expect(negozio.configura).toHaveBeenCalledWith('goog_x', 'salone1')
    expect(negozio.offering).toHaveBeenCalledWith('groomly_standard')
    expect(negozio.compra).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'pacchetto' }))
    await avviaAcquisto(dati())
    expect(negozio.configura).toHaveBeenCalledTimes(1)
    expect(negozio.collega).not.toHaveBeenCalled()
    await avviaAcquisto(dati({ salonId: 'salone2' }))
    expect(negozio.collega).toHaveBeenCalledWith('salone2')
  })

  it('offering assente o senza pacchetto: non disponibile, nessun errore', async () => {
    negozio.offering.mockResolvedValueOnce(null)
    expect(await avviaAcquisto(dati())).toBe('non-disponibile')
    negozio.offering.mockResolvedValueOnce({ availablePackages: [] })
    expect(await avviaAcquisto(dati())).toBe('non-disponibile')
    expect(negozio.compra).not.toHaveBeenCalled()
  })

  it('SDK che non si configura (chiave sbagliata): non disponibile', async () => {
    negozio.configura.mockRejectedValueOnce({ code: '23' })
    expect(await avviaAcquisto(dati())).toBe('non-disponibile')
  })

  it('annullato dall’utente', async () => {
    negozio.compra.mockRejectedValueOnce({ userCancelled: true })
    expect(await avviaAcquisto(dati())).toBe('annullato')
  })

  it('il doppio tocco non fa due acquisti', async () => {
    const [a, b] = await Promise.all([avviaAcquisto(dati()), avviaAcquisto(dati())])
    expect([a, b]).toEqual(['ok', 'ok'])
    expect(negozio.compra).toHaveBeenCalledTimes(1)
  })

  it('ripristino', async () => {
    expect(await ripristinaAcquisti(dati())).toBe('ok')
    expect(negozio.ripristina).toHaveBeenCalled()
    negozio.ripristina.mockRejectedValueOnce(new Error('rete'))
    expect(await ripristinaAcquisti(dati())).toBe('errore')
    expect(await ripristinaAcquisti(dati({ abbonamentiAttivi: false }))).toBe('spento')
  })
})
