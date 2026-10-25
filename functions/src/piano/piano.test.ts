import { describe, expect, it } from 'vitest'
import {
  campiAzione,
  campiBase,
  campiProva,
  decisioneManuale,
  decisioneProva,
  documentoChiuso,
  scriviPiano,
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

  it('la seconda prova risponde Prova già usata', () => {
    expect(decisioneProva('titolare', { provaUsata: true })).toEqual({ ok: false, message: 'Prova già usata' })
    expect(campiAzione('prova', adesso, true)).toEqual({ message: 'Prova già usata' })
    expect(decisioneProva('collaboratore', { provaUsata: false })).toEqual({ ok: false, message: 'Accesso negato' })
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
