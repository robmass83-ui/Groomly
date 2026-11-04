import { describe, expect, it } from 'vitest'
import { avviso, betaInCorso, pianoCheBlocca, proMainDi, salonIdValido } from './comune'

const ADESSO = new Date('2026-11-04T10:00:00.000Z')
const FUTURO = '2026-12-01T00:00:00.000Z'
const PASSATO = '2026-10-01T00:00:00.000Z'

describe('salonIdValido', () => {
  it('rifiuta vuoti, percorsi e shared', () => {
    expect(salonIdValido('uid-1')).toBe(true)
    expect(salonIdValido('')).toBe(false)
    expect(salonIdValido('a/b')).toBe(false)
    expect(salonIdValido('shared')).toBe(false)
    expect(salonIdValido(3)).toBe(false)
  })
})

describe('proMainDi', () => {
  it('legge piano, fonte, scadenza e traccia, ignorando il resto', () => {
    expect(proMainDi({ piano: 'pro', stato: 'attivo', fonte: 'beta', scadeIl: FUTURO, exBeta: true, betaPiano: 'pro', boh: 1 }))
      .toEqual({ piano: 'pro', stato: 'attivo', fonte: 'beta', scadeIl: FUTURO, exBeta: true, betaPiano: 'pro' })
    expect(proMainDi(undefined)).toBeUndefined()
    expect(proMainDi({ piano: 'oro', fonte: 'x' })).toEqual({ fonte: null })
  })
})

describe('betaInCorso e pianoCheBlocca', () => {
  const vivo = (fonte: string, piano = 'pro', scadeIl: string | null = FUTURO) => proMainDi({ piano, stato: 'attivo', fonte, scadeIl })

  it('la beta in corso è solo fonte beta non scaduta', () => {
    expect(betaInCorso(vivo('beta'), ADESSO)).toBe(true)
    expect(betaInCorso(vivo('beta', 'pro', PASSATO), ADESSO)).toBe(false)
    expect(betaInCorso(vivo('manuale', 'pro', null), ADESSO)).toBe(false)
    expect(betaInCorso(undefined, ADESSO)).toBe(false)
  })

  it('bloccano manuale, omaggio Plus e play vivi; non prova, beta, VIP, Go o scaduti', () => {
    expect(pianoCheBlocca(vivo('manuale', 'pro', null), ADESSO)).toBe(true)
    expect(pianoCheBlocca(vivo('omaggio', 'pro', null), ADESSO)).toBe(true)
    expect(pianoCheBlocca(vivo('play'), ADESSO)).toBe(true)
    expect(pianoCheBlocca(proMainDi({ piano: 'pro', stato: 'prova', fonte: 'prova', scadeIl: FUTURO }), ADESSO)).toBe(false)
    expect(pianoCheBlocca(vivo('beta'), ADESSO)).toBe(false)
    expect(pianoCheBlocca(vivo('omaggio', 'salone', null), ADESSO)).toBe(false)
    expect(pianoCheBlocca(proMainDi({ piano: 'base', stato: 'scaduto', fonte: null }), ADESSO)).toBe(false)
    expect(pianoCheBlocca(vivo('play', 'pro', PASSATO), ADESSO)).toBe(false)
    expect(pianoCheBlocca(undefined, ADESSO)).toBe(false)
  })
})

describe('avviso', () => {
  it('scrive un evento nuovo non letto con i campi vuoti a null', () => {
    expect(avviso('invito', 'salone', ADESSO, { scadeIl: FUTURO, giorni: 60, testo: 'Ciao' })).toEqual({
      tipo: 'invito', piano: 'salone', scadeIl: FUTURO, giorni: 60, testo: 'Ciao', at: ADESSO.toISOString(), letto: false,
    })
    expect(avviso('revoca', 'pro', ADESSO)).toEqual({
      tipo: 'revoca', piano: 'pro', scadeIl: null, giorni: null, testo: null, at: ADESSO.toISOString(), letto: false,
    })
  })
})
