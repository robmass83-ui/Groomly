import { describe, expect, it } from 'vitest'
import { aprePaywall, eFeature, FONTI_PIANO, fonteDi, haAccesso, livelloMinimo, mostraSegno, postiTotali, provaConcessa, statoPiano, statoPianoNome, tracciaBetaDi, type FeatureKey, type ProMain } from './piano'

const ora = new Date('2026-10-25T10:00:00.000Z')
const fra = (giorni: number) => new Date(ora.getTime() + giorni * 24 * 60 * 60 * 1000).toISOString()

describe('piano', () => {
  it('legge solo uno stato di piano noto', () => {
    expect(statoPianoNome('disdetto')).toBe('disdetto')
    expect(statoPianoNome('altro')).toBeUndefined()
    expect(statoPianoNome(1)).toBeUndefined()
  })

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

  it('la prova appena avviata dice 30 giorni anche con l’orologio del telefono indietro di qualche minuto', () => {
    const giorno = 24 * 60 * 60 * 1000
    const dopo = (ms: number) => new Date(ora.getTime() + ms).toISOString()
    expect(statoPiano({ piano: 'pro', stato: 'prova', scadeIl: dopo(30 * giorno + 3 * 60 * 1000) }, ora).giorniProva).toBe(30)
    expect(statoPiano({ piano: 'pro', stato: 'prova', scadeIl: dopo(29 * giorno + 60 * 60 * 1000) }, ora).giorniProva).toBe(30)
    expect(statoPiano({ piano: 'pro', stato: 'prova', scadeIl: dopo(29 * giorno - 60 * 60 * 1000) }, ora).giorniProva).toBe(29)
  })

  it('la prova scaduta da poco (offline) dice 0 giorni', () => {
    const scadeIl = new Date(ora.getTime() - 60 * 60 * 1000).toISOString()
    expect(statoPiano({ piano: 'pro', stato: 'prova', scadeIl }, ora, { offline: true }).giorniProva).toBe(0)
  })

  it('salone include il pro, il pro non include il team', () => {
    const pro = statoPiano({ piano: 'pro', stato: 'attivo', scadeIl: fra(3) }, ora)
    const salone = statoPiano({ piano: 'salone', stato: 'attivo', scadeIl: null, fonte: 'omaggio' }, ora)
    const chiavi: FeatureKey[] = ['export', 'team', 'prenotazioni', 'fedelta', 'drive']
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

  it('il catalogo dice chi ha accesso a cosa', () => {
    const base = statoPiano(undefined, ora)
    const pro = statoPiano({ piano: 'pro', stato: 'attivo', scadeIl: fra(1) }, ora)
    const salone = statoPiano({ piano: 'salone', stato: 'attivo', scadeIl: null, fonte: 'omaggio' }, ora)
    expect(haAccesso(base, 'export')).toBe(false)
    expect(haAccesso(pro, 'backupAuto')).toBe(true)
    expect(haAccesso(pro, 'team')).toBe(false)
    expect(haAccesso(salone, 'messaggiCategoria')).toBe(true)
    expect(eFeature('statistiche')).toBe(false)
    expect(eFeature('reportPassati')).toBe(false)
  })

  it('il segno compare solo se manca l’accesso e la funzione non è nascosta', () => {
    const base = statoPiano(undefined, ora)
    const pro = statoPiano({ piano: 'pro', stato: 'attivo', scadeIl: fra(1) }, ora)
    expect(mostraSegno(base, 'drive')).toBe(true)
    expect(mostraSegno(base, 'copieCloud')).toBe(false)
    expect(mostraSegno(pro, 'drive')).toBe(false)
  })

  it('l’omaggio senza scadenza non ha limiti Pro e non propone', () => {
    const stato = statoPiano({
      piano: 'salone', stato: 'attivo', fonte: 'omaggio', scadeIl: null, seatsIncluded: 3,
    }, ora)
    expect(stato.livello).toBe('salone')
    expect(stato.stato).toBe('attivo')
    expect(stato.scadeIl).toBeNull()
    const chiavi: FeatureKey[] = [
      'export', 'backupAuto', 'drive', 'messaggiCategoria', 'copieCloud', 'promemoriaAuto', 'richiamo',
      'pronto', 'compleanno',
      'prenotazioni', 'listaAttesa', 'recensioni', 'fedelta', 'team', 'postiExtra',
    ]
    for (const chiave of chiavi) {
      expect(haAccesso(stato, chiave)).toBe(true)
      expect(aprePaywall(stato, chiave)).toBe(false)
    }
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

  it('prova concessa solo a chi è su Go senza tracce di un piano superiore', () => {
    const vero: Array<ProMain | undefined> = [
      undefined,
      { piano: 'base', stato: 'scaduto', fonte: null },
      {},
    ]
    const falso: ProMain[] = [
      { piano: 'pro', stato: 'attivo', fonte: 'play', scadeIl: fra(10) },
      { piano: 'pro', stato: 'prova', fonte: 'prova', scadeIl: fra(12), provaUsata: true },
      { piano: 'pro', stato: 'grazia', fonte: 'play', scadeIl: fra(2) },
      { piano: 'pro', stato: 'disdetto', fonte: 'play', scadeIl: fra(4) },
      { piano: 'pro', stato: 'attivo', fonte: 'omaggio', scadeIl: null },
      { piano: 'salone', stato: 'attivo', fonte: 'manuale' },
      { piano: 'pro', stato: 'scaduto', fonte: 'play' },
      { piano: 'base', stato: 'scaduto', fonte: null, provaUsata: true },
      { piano: 'pro', stato: 'prova', fonte: 'prova', scadeIl: fra(-1) },
    ]
    for (const doc of vero) expect(provaConcessa(doc, ora)).toBe(true)
    for (const doc of falso) expect(provaConcessa(doc, ora)).toBe(false)
  })
})

describe('fonte beta', () => {
  const adesso = new Date('2026-11-04T10:00:00.000Z')

  it('fonteDi riconosce solo le fonti note', () => {
    expect(FONTI_PIANO).toEqual(['play', 'prova', 'omaggio', 'manuale', 'beta'])
    expect(fonteDi('beta')).toBe('beta')
    expect(fonteDi('omaggio')).toBe('omaggio')
    expect(fonteDi('xyz')).toBeNull()
    expect(fonteDi(3)).toBeNull()
    expect(fonteDi(null)).toBeNull()
  })

  it('una beta attiva dà il livello finché non scade', () => {
    const futura = { piano: 'salone', stato: 'attivo', fonte: 'beta', scadeIl: '2026-12-01T00:00:00.000Z' } as const
    expect(statoPiano(futura, adesso)).toMatchObject({ livello: 'salone', fonte: 'beta' })
    expect(statoPiano({ ...futura, scadeIl: '2026-11-01T00:00:00.000Z' }, adesso).livello).toBe('base')
  })

  it('chi ha fatto la beta non ha la prova self-service', () => {
    expect(provaConcessa({ piano: 'base', stato: 'scaduto', fonte: 'beta' }, adesso)).toBe(false)
    expect(provaConcessa({ piano: 'base', stato: 'scaduto', fonte: null, exBeta: true }, adesso)).toBe(false)
    expect(provaConcessa({ piano: 'base', stato: 'scaduto', fonte: null }, adesso)).toBe(true)
  })

  it('tracciaBetaDi tiene solo i campi validi', () => {
    expect(tracciaBetaDi({ exBeta: true, betaPiano: 'x', earlyAdopter: 'si', betaDal: 5 })).toEqual({ exBeta: true })
    expect(tracciaBetaDi({
      exBeta: true, betaPiano: 'salone', betaDal: '2026-11-01T00:00:00.000Z', betaFinoAl: '2026-12-01T00:00:00.000Z', earlyAdopter: false,
    })).toEqual({
      exBeta: true, betaPiano: 'salone', betaDal: '2026-11-01T00:00:00.000Z', betaFinoAl: '2026-12-01T00:00:00.000Z', earlyAdopter: false,
    })
    expect(tracciaBetaDi(null)).toEqual({})
  })
})
