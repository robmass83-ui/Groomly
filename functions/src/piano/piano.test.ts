import { describe, expect, it } from 'vitest'
import { provaConcessa, type ProMain } from '../../../src/lib/piano'
import { decisioneBypass } from '../../../src/lib/pianoBypass'
import {
  campiAzione,
  campiBase,
  campiBypass,
  campiOmaggio,
  campiProva,
  conTraccia,
  decisioneManuale,
  decisioneProva,
  documentoChiuso,
  scriviPiano,
  tracciaProva,
} from './scriviPiano'

const adesso = new Date('2026-10-25T12:00:00.000Z')

describe('scriviPiano', () => {
  it('omaggio salone accende il team con tre posti', () => {
    const scritto = scriviPiano(campiAzione('salone', adesso, false) as ReturnType<typeof campiBase>, adesso)
    expect(scritto.enabled).toBe(true)
    expect(scritto.seats).toBe(3)
    expect(scritto.piano).toBe('salone')
    expect(scritto.fonte).toBe('omaggio')
  })

  it('la prova non accende il team e segna provaUsata', () => {
    const campi = campiProva(adesso)
    const scritto = scriviPiano(campi, adesso)
    expect(scritto.enabled).toBe(false)
    expect(scritto.provaUsata).toBe(true)
    expect(scritto.piano).toBe('pro')
    expect(scritto.stato).toBe('prova')
  })

  it('la prova da sé è rifiutata a chi ha o ha avuto un piano superiore', () => {
    const rifiuto = { ok: false, message: 'Prova non disponibile' }
    const grazia: ProMain = { piano: 'pro', stato: 'grazia', fonte: 'play', scadeIl: '2026-10-30T00:00:00.000Z' }
    const omaggio: ProMain = { piano: 'salone', stato: 'attivo', fonte: 'omaggio', scadeIl: null }
    const exPlus: ProMain = { piano: 'base', stato: 'scaduto', fonte: 'play', scadeIl: '2026-09-01T00:00:00.000Z' }
    expect(decisioneProva('titolare', grazia, adesso)).toEqual(rifiuto)
    expect(decisioneProva('titolare', omaggio, adesso)).toEqual(rifiuto)
    expect(decisioneProva('titolare', exPlus, adesso)).toEqual(rifiuto)
    expect(decisioneProva('titolare', { provaUsata: true }, adesso)).toEqual(rifiuto)
    expect(decisioneProva('titolare', undefined, adesso)).toEqual({ ok: true })
    expect(decisioneProva('collaboratore', undefined, adesso)).toEqual({ ok: false, message: 'Accesso negato' })
  })

  it('un piano Plus o Salone scritto lascia il segno della prova', () => {
    expect(scriviPiano(campiOmaggio('pro'), adesso).provaUsata).toBe(true)
    expect(scriviPiano(campiOmaggio('salone'), adesso).provaUsata).toBe(true)
    expect(scriviPiano(campiProva(adesso), adesso).provaUsata).toBe(true)
    expect(scriviPiano(campiBypass({ piano: 'pro', stato: 'attivo', fonte: 'play', scadeIl: '2026-12-01T00:00:00.000Z' }), adesso).provaUsata).toBe(true)
    expect(scriviPiano(campiBase(false), adesso).provaUsata).toBe(false)
  })

  it('l’operatore avvia la prova anche se è già stata usata', () => {
    expect(campiAzione('prova', adesso, true)).toMatchObject({ stato: 'prova', fonte: 'prova' })
  })

  it('setSalonPro false torna a base', () => {
    const scritto = scriviPiano(campiBase(true), adesso)
    expect(scritto.piano).toBe('base')
    expect(scritto.stato).toBe('scaduto')
    expect(scritto.enabled).toBe(false)
    expect(scritto.seats).toBe(0)
  })

  it('il manuale rifiuta shared e chi non è operatore', () => {
    expect(decisioneManuale(false, 'salon-1')).toEqual({ ok: false, message: 'Accesso negato' })
    expect(decisioneManuale(true, 'shared')).toEqual({ ok: false, message: 'Accesso negato' })
    expect(decisioneManuale(true, 'salon-1').ok).toBe(true)
  })

  it('una prova scaduta senza Play torna a base', () => {
    const chiuso = documentoChiuso({
      ...campiProva(new Date(adesso.getTime() - 40 * 24 * 60 * 60 * 1000)),
    }, adesso)
    expect(chiuso?.piano).toBe('base')
    expect(chiuso?.stato).toBe('scaduto')
    expect(chiuso?.enabled).toBe(false)
    expect(documentoChiuso({ ...campiProva(adesso), fonte: 'play' }, adesso)).toBeNull()
  })
})

describe('traccia della prova quando si spegne', () => {
  const legacy: ProMain = { piano: 'salone', stato: 'attivo', fonte: 'omaggio', scadeIl: null }

  it('un omaggio scritto prima della regola resta tracciato dopo "base"', () => {
    const traccia = tracciaProva(legacy, false, adesso)
    expect(traccia).toBe(true)
    const scritto = scriviPiano(conTraccia(campiAzione('base', adesso, traccia), traccia), adesso)
    expect(scritto.provaUsata).toBe(true)
    expect(provaConcessa(scritto, adesso)).toBe(false)
  })

  it('un omaggio scritto prima della regola resta tracciato dopo "spegni-omaggio"', () => {
    const traccia = tracciaProva(legacy, false, adesso)
    const decisione = decisioneBypass(legacy, 'spegni-omaggio', '', adesso)
    if (!decisione.ok) throw new Error('decisione attesa ok')
    const scritto = scriviPiano(conTraccia(campiBypass(decisione.campi), traccia), adesso)
    expect(scritto.provaUsata).toBe(true)
    expect(provaConcessa(scritto, adesso)).toBe(false)
  })

  it('un Go puro senza documento resta senza traccia dopo "base"', () => {
    const traccia = tracciaProva(undefined, false, adesso)
    expect(traccia).toBe(false)
    const scritto = scriviPiano(conTraccia(campiAzione('base', adesso, traccia), traccia), adesso)
    expect(provaConcessa(scritto, adesso)).toBe(true)
  })
})
