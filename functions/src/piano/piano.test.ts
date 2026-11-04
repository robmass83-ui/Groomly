import { describe, expect, it } from 'vitest'
import { provaConcessa, type ProMain } from '../../../src/lib/piano'
import { decisioneBypass } from '../../../src/lib/pianoBypass'
import {
  type CampiPiano,
  type FontePiano,
  type StatoPiano,
  campiAzione,
  campiBase,
  campiBeta,
  campiBypass,
  campiOmaggio,
  campiProva,
  conTraccia,
  decisioneManuale,
  decisioneProva,
  pianoScaduto,
  scriviPiano,
  tracciaBeta,
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

describe('pianoScaduto', () => {
  const ora = new Date('2026-11-02T10:00:00.000Z')
  const passata = '2026-11-01T10:00:00.000Z'
  const futura = '2026-12-01T10:00:00.000Z'
  const salone = (stato: StatoPiano, scadeIl: string | null, fonte: FontePiano = 'play'): CampiPiano =>
    ({ piano: 'salone', stato, fonte, scadeIl, seatsIncluded: 3 })

  it('chiude in grazia scaduta anche con fonte play', () => {
    expect(pianoScaduto(salone('grazia', passata), ora))
      .toMatchObject({ piano: 'base', stato: 'scaduto', enabled: false, provaUsata: true })
  })

  it('chiude disdetto, Plus attivo e Plus in prova con data passata', () => {
    expect(pianoScaduto(salone('disdetto', passata), ora)?.stato).toBe('scaduto')
    expect(pianoScaduto({ ...salone('attivo', passata), piano: 'pro' }, ora)?.enabled).toBe(false)
    expect(pianoScaduto({ ...campiProva(ora), scadeIl: passata }, ora)?.piano).toBe('base')
  })

  it('non tocca data futura, piani senza data, date illeggibili e gia scaduti', () => {
    expect(pianoScaduto(salone('grazia', futura), ora)).toBeNull()
    expect(pianoScaduto(salone('attivo', null, 'omaggio'), ora)).toBeNull()
    expect(pianoScaduto(salone('attivo', null, 'manuale'), ora)).toBeNull()
    expect(pianoScaduto(salone('attivo', 'mah'), ora)).toBeNull()
    expect(pianoScaduto(salone('scaduto', passata), ora)).toBeNull()
  })
})

describe('beta', () => {
  const ora = new Date('2026-11-04T10:00:00.000Z')
  const fra30 = '2026-12-04T10:00:00.000Z'

  it('campiBeta Salone: 3 posti, attivo, scade dopo i giorni, ricorda Plus', () => {
    expect(scriviPiano(campiBeta('salone', 30, ora), ora)).toEqual({
      piano: 'salone', stato: 'attivo', fonte: 'beta', scadeIl: fra30,
      seatsIncluded: 3, seatsExtra: 0, seats: 3, enabled: true, provaUsata: true, rinnovoAutomatico: false,
    })
    expect(scriviPiano(campiBeta('pro', 30, ora), ora)).toMatchObject({ piano: 'pro', fonte: 'beta', seats: 0, enabled: false })
  })

  it('campiBeta rifiuta durate fuori da 1-365 o non intere', () => {
    expect(() => campiBeta('pro', 0, ora)).toThrow(RangeError)
    expect(() => campiBeta('pro', 366, ora)).toThrow(RangeError)
    expect(() => campiBeta('pro', 1.5, ora)).toThrow(RangeError)
    expect(() => campiBeta('pro', Number.NaN, ora)).toThrow(RangeError)
  })

  it('tracciaBeta segna ex beta ed early adopter', () => {
    expect(tracciaBeta('salone', ora, fra30)).toEqual({
      exBeta: true, betaPiano: 'salone', betaDal: ora.toISOString(), betaFinoAl: fra30, earlyAdopter: true,
    })
  })

  it('una beta scaduta torna a Go senza toccare la traccia', () => {
    const chiuso = pianoScaduto({ ...campiBeta('salone', 30, ora), scadeIl: '2026-11-03T10:00:00.000Z' }, ora)
    expect(chiuso).toMatchObject({ piano: 'base', stato: 'scaduto', enabled: false, provaUsata: true })
    for (const chiave of ['exBeta', 'betaPiano', 'betaDal', 'betaFinoAl', 'earlyAdopter']) expect(chiuso).not.toHaveProperty(chiave)
  })

  it('spegnere una beta non chiede il testo come Play', () => {
    const beta: ProMain = { piano: 'salone', stato: 'attivo', fonte: 'beta', scadeIl: fra30 }
    expect(decisioneBypass(beta, 'spegni', '', ora)).toMatchObject({ ok: true, avviso: null })
    expect(decisioneBypass(beta, 'scegli-pro', '', ora)).toMatchObject({ ok: true, avviso: null })
  })
})
