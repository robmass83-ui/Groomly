import { describe, expect, it } from 'vitest'
import { decisioneBypass } from './pianoBypass'

const play = { piano: 'salone' as const, stato: 'attivo' as const, fonte: 'play' as const, scadeIl: '2026-12-01T00:00:00.000Z' }
const manuale = { piano: 'pro' as const, stato: 'attivo' as const, fonte: 'manuale' as const, scadeIl: null }
const omaggio = { piano: 'salone' as const, stato: 'attivo' as const, fonte: 'omaggio' as const, scadeIl: null }
const quando = new Date('2026-10-28T12:00:00.000Z')

describe('bypass del piano', () => {
  it('sceglie Pro o Salone come manuale, senza testo', () => {
    expect(decisioneBypass(undefined, 'scegli-pro', '')).toMatchObject({ ok: true, avviso: null, campi: { piano: 'pro', fonte: 'manuale', stato: 'attivo', scadeIl: null } })
    expect(decisioneBypass(manuale, 'scegli-salone', '   ')).toMatchObject({ ok: true, campi: { piano: 'salone', fonte: 'manuale' } })
  })

  it('spegne un manuale e una prova senza testo, e un Play attivo solo con il testo', () => {
    expect(decisioneBypass(manuale, 'spegni', '')).toMatchObject({ ok: true, avviso: null, campi: { piano: 'base' } })
    expect(decisioneBypass({ ...manuale, fonte: 'prova', stato: 'prova' }, 'spegni', '')).toMatchObject({ ok: true, avviso: null })
    expect(decisioneBypass(play, 'spegni', '  ')).toEqual({ ok: false, manca: 'testo' })
    const spento = decisioneBypass(play, 'spegni', '  Abbiamo chiuso il piano.  ')
    expect(spento).toMatchObject({ ok: true, avviso: 'Abbiamo chiuso il piano.', campi: { piano: 'base', fonte: null } })
  })

  it('un omaggio non si spegne con spegni, sì con spegni-omaggio', () => {
    expect(decisioneBypass(omaggio, 'spegni', 'motivo')).toEqual({ ok: false, manca: 'vip' })
    expect(decisioneBypass(omaggio, 'spegni-omaggio', '')).toMatchObject({ ok: true, avviso: null })
  })

  it('un testo oltre 400 caratteri non parte', () => {
    expect(decisioneBypass(play, 'spegni', 'a'.repeat(401))).toEqual({ ok: false, manca: 'testo' })
  })

  it('un Play in grazia o disdetto ancora in corso chiede il testo', () => {
    expect(decisioneBypass({ ...play, stato: 'grazia' }, 'spegni', '', quando)).toEqual({ ok: false, manca: 'testo' })
    expect(decisioneBypass({ ...play, stato: 'disdetto', scadeIl: '2026-10-29T00:00:00.000Z' }, 'spegni', '', quando)).toEqual({ ok: false, manca: 'testo' })
  })

  it('un Play disdetto già scaduto o con stato scaduto si spegne senza testo', () => {
    expect(decisioneBypass({ ...play, stato: 'disdetto', scadeIl: '2026-10-27T00:00:00.000Z' }, 'spegni', '', quando)).toMatchObject({ ok: true, avviso: null, campi: { piano: 'base' } })
    expect(decisioneBypass({ ...play, stato: 'scaduto' }, 'spegni', '', quando)).toMatchObject({ ok: true, avviso: null })
  })
})
