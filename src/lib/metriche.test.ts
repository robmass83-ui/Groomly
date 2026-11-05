import { describe, expect, it, vi } from 'vitest'
import { devoChiedere, nomePiano, puoRaccogliere, puoRispondere, registra, type ProfiloMetriche } from './metriche'
import { VERSIONE_DOCUMENTI, type ConsensoMetriche, type TerminiAccount } from './versioneLegale'

const OK: ProfiloMetriche = { nativo: true, role: 'titolare', admin: false, protetto: false, vip: false, email: 'a@b.it' }
const SI: ConsensoMetriche = { attivo: true, at: 'x', fonte: 'account', versione: 2 }
const ACCETTATI: TerminiAccount = { accettati: true, at: 'x', versione: VERSIONE_DOCUMENTI }

describe('registra', () => {
  it('senza consenso non manda nulla', () => {
    const sink = vi.fn()
    registra(false, { nome: 'paywall_aperta', feature: 'export', fonte: 'home' }, sink)
    expect(sink).not.toHaveBeenCalled()
    registra(true, { nome: 'paywall_aperta', feature: 'export', fonte: 'home' }, sink)
    expect(sink).toHaveBeenCalledTimes(1)
  })
})

describe('chi può raccogliere', () => {
  it('il titolare col sì raccoglie', () => {
    expect(puoRaccogliere(OK, SI)).toBe(true)
  })

  it.each<Partial<ProfiloMetriche>>([
    { nativo: false }, { role: 'socio' }, { role: 'collaboratore' }, { role: undefined }, { admin: true },
    { protetto: true }, { vip: true }, { email: 'salone1@test.groomly' }, { email: 'SALONE1@TEST.GROOMLY' },
  ])('non raccoglie con %o', (variante) => {
    expect(puoRaccogliere({ ...OK, ...variante }, SI)).toBe(false)
    expect(puoRispondere({ ...OK, ...variante })).toBe(false)
  })

  it('senza consenso o col no non raccoglie', () => {
    expect(puoRaccogliere(OK, undefined)).toBe(false)
    expect(puoRaccogliere(OK, { ...SI, attivo: false })).toBe(false)
  })
})

describe('quando si chiede', () => {
  it('si chiede solo a chi può rispondere, non ha risposto e ha i documenti in vigore', () => {
    expect(devoChiedere(OK, undefined, ACCETTATI)).toBe(true)
    expect(devoChiedere({ ...OK, role: 'socio' }, undefined, ACCETTATI)).toBe(false)
    expect(devoChiedere(OK, { ...SI, attivo: false }, ACCETTATI)).toBe(false)
    expect(devoChiedere(OK, undefined, { ...ACCETTATI, versione: VERSIONE_DOCUMENTI - 1 })).toBe(false)
    expect(devoChiedere(OK, undefined, undefined)).toBe(false)
  })
})

describe('nomePiano', () => {
  it('usa i nomi pubblici', () => {
    expect(nomePiano('base')).toBe('go')
    expect(nomePiano('pro')).toBe('plus')
    expect(nomePiano('salone')).toBe('salon')
  })
})
