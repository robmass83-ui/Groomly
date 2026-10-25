import { describe, expect, it } from 'vitest'
import { aprePaywall, haAccesso, livelloMinimo, mostraBadge, postiTotali, propostaVisibile, puoProporre, statoPiano, type FeatureKey, type ProMain } from './piano'

const ora = new Date('2026-10-25T10:00:00.000Z')
const fra = (giorni: number) => new Date(ora.getTime() + giorni * 24 * 60 * 60 * 1000).toISOString()

describe('piano', () => {
  it('senza documento è base', () => {
    const stato = statoPiano(undefined, ora)
    expect(stato.livello).toBe('base')
    expect(stato.stato).toBe('assente')
    expect(stato.posti).toBe(0)
    expect(haAccesso(stato, 'export')).toBe(false)
  })

  it('conta i posti inclusi più gli extra, oppure seats se manca il dettaglio', () => {
    expect(postiTotali({ seatsIncluded: 3, seatsExtra: 1 })).toBe(4)
    expect(postiTotali({ seats: 3 })).toBe(3)
    expect(postiTotali(undefined)).toBe(0)
  })

  const casi: Array<[string, ProMain, { offline?: boolean }, string]> = [
    ['attivo pro', { piano: 'pro', stato: 'attivo', scadeIl: fra(10) }, {}, 'pro'],
    ['prova', { piano: 'pro', stato: 'prova', scadeIl: fra(12), fonte: 'prova' }, {}, 'pro'],
    ['grazia', { piano: 'pro', stato: 'grazia', scadeIl: fra(2) }, {}, 'pro'],
    ['disdetto futuro', { piano: 'salone', stato: 'disdetto', scadeIl: fra(4) }, {}, 'salone'],
    ['disdetto passato', { piano: 'salone', stato: 'disdetto', scadeIl: fra(-1) }, {}, 'base'],
    ['sospeso', { piano: 'pro', stato: 'sospeso', scadeIl: fra(10) }, {}, 'base'],
    ['scaduto', { piano: 'pro', stato: 'scaduto', scadeIl: fra(10) }, {}, 'base'],
    ['omaggio senza data', { piano: 'salone', stato: 'attivo', fonte: 'omaggio', scadeIl: null, seatsIncluded: 3 }, {}, 'salone'],
    ['offline sotto 72 ore', { piano: 'pro', stato: 'attivo', scadeIl: fra(-1) }, { offline: true }, 'pro'],
    ['offline oltre 72 ore', { piano: 'pro', stato: 'attivo', scadeIl: fra(-4) }, { offline: true }, 'base'],
    ['online appena scaduto', { piano: 'pro', stato: 'attivo', scadeIl: fra(-1) }, {}, 'base'],
  ]

  it.each(casi)('%s → %s', (_nome, doc, opzioni, atteso) => {
    expect(statoPiano(doc, ora, opzioni).livello).toBe(atteso)
  })

  it('la prova dice quanti giorni restano', () => {
    const stato = statoPiano({ piano: 'pro', stato: 'prova', scadeIl: fra(12) }, ora)
    expect(stato.inProva).toBe(true)
    expect(stato.giorniProva).toBe(12)
  })

  it('salone include il pro, il pro non include il team', () => {
    const pro = statoPiano({ piano: 'pro', stato: 'attivo', scadeIl: fra(3) }, ora)
    const salone = statoPiano({ piano: 'salone', stato: 'attivo', scadeIl: null, fonte: 'omaggio' }, ora)
    const chiavi: FeatureKey[] = ['export', 'team', 'prenotazioni', 'fedelta', 'statistiche']
    for (const chiave of chiavi) {
      if (chiave === 'team') {
        expect(haAccesso(pro, chiave)).toBe(false)
        expect(haAccesso(salone, chiave)).toBe(true)
      } else {
        expect(haAccesso(pro, chiave)).toBe(true)
        expect(haAccesso(salone, chiave)).toBe(true)
      }
    }
    expect(livelloMinimo('team')).toBe('salone')
    expect(livelloMinimo('export')).toBe('pro')
  })

  it('il badge sta spento se i piani non si mostrano o se l’accesso c’è già', () => {
    const base = statoPiano(undefined, ora)
    const pro = statoPiano({ piano: 'pro', stato: 'attivo', scadeIl: fra(1) }, ora)
    expect(mostraBadge({ mostraPiani: false }, base, 'export')).toBe(false)
    expect(mostraBadge({}, base, 'export')).toBe(false)
    expect(mostraBadge({ mostraPiani: true }, base, 'export')).toBe(true)
    expect(mostraBadge({ mostraPiani: true }, pro, 'export')).toBe(false)
    expect(mostraBadge({ mostraPiani: true }, base, 'pagella')).toBe(false)
  })

  it('l’omaggio senza scadenza non ha limiti Pro e non propone', () => {
    const stato = statoPiano({
      piano: 'salone', stato: 'attivo', fonte: 'omaggio', scadeIl: null, seatsIncluded: 3,
    }, ora)
    expect(stato.livello).toBe('salone')
    expect(stato.stato).toBe('attivo')
    expect(stato.scadeIl).toBeNull()
    const chiavi: FeatureKey[] = [
      'reportPassati', 'export', 'copieCloud', 'promemoriaAuto', 'richiamo', 'pronto', 'compleanno',
      'pagella', 'prezzoSuggerito', 'aumentoListino', 'collage', 'senzaFirma', 'prenotazioni',
      'listaAttesa', 'recensioni', 'fedelta', 'schedaCliente', 'statistiche', 'team', 'postiExtra',
    ]
    for (const chiave of chiavi) {
      expect(haAccesso(stato, chiave)).toBe(true)
      expect(aprePaywall(stato, chiave)).toBe(false)
    }
    expect(propostaVisibile(true, stato)).toBe(false)
    expect(propostaVisibile(true, statoPiano(undefined, ora))).toBe(true)
    expect(propostaVisibile(false, statoPiano(undefined, ora))).toBe(false)
  })

  it('non propone prima di 7 giorni né se l’ultima proposta è recente', () => {
    expect(puoProporre({}, new Date(ora.getTime() - 3 * 86400000), ora)).toBe(false)
    expect(puoProporre({ ultimaProposta: fra(-3) }, new Date(ora.getTime() - 30 * 86400000), ora)).toBe(false)
    expect(puoProporre({ ultimaProposta: fra(-8) }, new Date(ora.getTime() - 30 * 86400000), ora)).toBe(true)
  })

  it('quaranta combinazioni di livello, stato e scadenza', () => {
    const livelli = ['base', 'pro', 'salone'] as const
    const stati = ['attivo', 'prova', 'grazia', 'disdetto', 'sospeso', 'scaduto'] as const
    let n = 0
    for (const piano of livelli) {
      for (const stato of stati) {
        for (const giorni of [10, -1, -4]) {
          n += 1
          const risultato = statoPiano({ piano, stato, scadeIl: fra(giorni) }, ora, { offline: giorni < 0 })
          expect(['base', 'pro', 'salone']).toContain(risultato.livello)
        }
      }
    }
    expect(n).toBe(54)
  })
})
