import { describe, expect, it } from 'vitest'
import { COLORE_PIANO, COLORE_PIANO_SCURO, PREZZI, avvisoPiano, ePianoVetrina, offertaPiano, pianoAttivo, statoScheda } from './abbonamento'
import { livelloElenco } from './funzioniPiano'
import { provaConcessa, statoPiano, type ProMain } from './piano'

describe('pianoAttivo', () => {
  it('Go è sempre attivo', () => {
    expect(pianoAttivo(undefined, 'go')).toBe(true)
    expect(pianoAttivo('base', 'go')).toBe(true)
  })

  it('base non ha Plus né Salone', () => {
    expect(pianoAttivo('base', 'plus')).toBe(false)
    expect(pianoAttivo('base', 'salone')).toBe(false)
    expect(pianoAttivo(undefined, 'plus')).toBe(false)
  })

  it('pro ha Plus ma non Salone', () => {
    expect(pianoAttivo('pro', 'plus')).toBe(true)
    expect(pianoAttivo('pro', 'salone')).toBe(false)
  })

  it('salone e vip hanno tutto', () => {
    for (const livello of ['salone', 'vip'] as const) {
      for (const piano of ['go', 'plus', 'salone'] as const) expect(pianoAttivo(livello, piano)).toBe(true)
    }
  })
})

describe('vetrina', () => {
  it('prezzi segnaposto', () => {
    expect(PREZZI).toEqual({ plus: '9,99 €', salone: '19,99 €' })
  })

  it('colori dei piani presi dai loghi', () => {
    expect(COLORE_PIANO).toEqual({ go: 'var(--pri-solid)', plus: '#7B3FE4', salone: '#C99200' })
    expect(COLORE_PIANO_SCURO).toEqual({ plus: '#4F2BB8', salone: '#8F6400' })
  })

  it('riconosce solo i tre piani della vetrina', () => {
    expect(ePianoVetrina('plus')).toBe(true)
    expect(ePianoVetrina('go')).toBe(true)
    expect(ePianoVetrina('pro')).toBe(false)
    expect(ePianoVetrina(undefined)).toBe(false)
  })
})

describe('statoScheda', () => {
  const adesso = new Date('2026-11-01T10:00:00.000Z')
  const piano = (doc: ProMain | undefined, extra: { provaConcessa?: boolean; pronto?: boolean } = {}) => {
    const stato = statoPiano(doc, adesso)
    return { stato, livelloNome: livelloElenco(doc, adesso), provaConcessa: extra.provaConcessa ?? provaConcessa(doc, adesso), pronto: extra.pronto }
  }

  it('finché il piano non è arrivato resta neutra', () => {
    expect(statoScheda(piano(undefined, { pronto: false }), true)).toEqual({ tipo: 'attesa' })
  })

  it('Go che non ha mai avuto Plus offre i 30 giorni solo al titolare', () => {
    expect(statoScheda(piano(undefined), true)).toEqual({ tipo: 'go', provaDisponibile: true })
    expect(statoScheda(piano(undefined), false)).toEqual({ tipo: 'go', provaDisponibile: false })
  })

  it('Go con la prova già usata non offre più i 30 giorni', () => {
    expect(statoScheda(piano({ piano: 'base', stato: 'scaduto', provaUsata: true }), true)).toEqual({ tipo: 'go', provaDisponibile: false })
  })

  it('una prova scaduta torna Go senza bollino', () => {
    const doc: ProMain = { piano: 'pro', stato: 'prova', fonte: 'prova', scadeIl: '2026-10-31T10:00:00.000Z', provaUsata: true }
    expect(statoScheda(piano(doc), true)).toEqual({ tipo: 'go', provaDisponibile: false })
  })

  it('in prova conta i giorni rimasti', () => {
    const doc: ProMain = { piano: 'pro', stato: 'prova', fonte: 'prova', scadeIl: '2026-11-13T10:00:00.000Z', provaUsata: true }
    expect(statoScheda(piano(doc), true)).toEqual({ tipo: 'prova', giorni: 12 })
  })

  it('Plus, Salone e VIP pagati', () => {
    expect(statoScheda(piano({ piano: 'pro', stato: 'attivo', fonte: 'manuale' }), true)).toEqual({ tipo: 'plus' })
    expect(statoScheda(piano({ piano: 'pro', stato: 'disdetto', fonte: 'play', scadeIl: '2026-11-20T00:00:00.000Z' }), true)).toEqual({ tipo: 'plus' })
    expect(statoScheda(piano({ piano: 'salone', stato: 'attivo', fonte: 'manuale' }), true)).toEqual({ tipo: 'salone' })
    expect(statoScheda(piano({ piano: 'salone', stato: 'attivo', fonte: 'omaggio', scadeIl: null }), true)).toEqual({ tipo: 'vip' })
  })

  it('Go in grazia dopo un Plus a pagamento non offre i 30 giorni', () => {
    const doc: ProMain = { piano: 'pro', stato: 'sospeso', fonte: 'play', scadeIl: '2026-10-20T00:00:00.000Z' }
    expect(statoScheda(piano(doc), true)).toEqual({ tipo: 'go', provaDisponibile: false })
  })

  it('un abbonamento sospeso torna Go', () => {
    expect(statoScheda(piano({ piano: 'pro', stato: 'sospeso', provaUsata: true }), true)).toEqual({ tipo: 'go', provaDisponibile: false })
  })
})

describe('avvisoPiano', () => {
  const adesso = new Date(2026, 10, 2)
  const fine = new Date(2026, 10, 20)
  const piano = (p: ProMain) => statoPiano(p, adesso)

  it('grazia: avviso solo al titolare', () => {
    const st = piano({ piano: 'salone', stato: 'grazia', fonte: 'play', scadeIl: fine.toISOString() })
    expect(avvisoPiano(st, true)).toEqual({ tipo: 'grazia' })
    expect(avvisoPiano(st, false)).toBeNull()
  })

  it('disdetto con data futura: avviso con la fine', () => {
    const st = piano({ piano: 'pro', stato: 'disdetto', fonte: 'play', scadeIl: fine.toISOString() })
    expect(avvisoPiano(st, true)).toEqual({ tipo: 'disdetto', fine: st.scadeIl })
  })

  it('attivo, Go e disdetto già scaduto: nessun avviso', () => {
    expect(avvisoPiano(piano({ piano: 'pro', stato: 'attivo', fonte: 'play', scadeIl: fine.toISOString() }), true)).toBeNull()
    expect(avvisoPiano(piano(undefined as unknown as ProMain), true)).toBeNull()
    expect(avvisoPiano(piano({ piano: 'pro', stato: 'disdetto', fonte: 'play', scadeIl: new Date(2026, 9, 1).toISOString() }), true)).toBeNull()
  })
})

describe('offertaPiano', () => {
  it('per il titolare la prova segue provaConcessa e l’acquisto segue abbonamentiAttivi', () => {
    expect(offertaPiano({ provaConcessa: true, abbonamentiAttivi: false, ruolo: 'titolare' })).toEqual({ prova: true, acquisto: 'avvisami' })
    expect(offertaPiano({ provaConcessa: true, abbonamentiAttivi: true, ruolo: 'titolare' })).toEqual({ prova: true, acquisto: 'abbonati' })
    expect(offertaPiano({ provaConcessa: false, abbonamentiAttivi: false, ruolo: 'titolare' })).toEqual({ prova: false, acquisto: 'avvisami' })
    expect(offertaPiano({ provaConcessa: false, abbonamentiAttivi: true, ruolo: 'titolare' })).toEqual({ prova: false, acquisto: 'abbonati' })
  })

  it('senza ruolo (sessione non ancora letta) vale come titolare', () => {
    expect(offertaPiano({ provaConcessa: true, abbonamentiAttivi: false, ruolo: undefined }).prova).toBe(true)
  })

  it('collaboratore e socio non vedono la prova', () => {
    expect(offertaPiano({ provaConcessa: true, abbonamentiAttivi: true, ruolo: 'collaboratore' }).prova).toBe(false)
    expect(offertaPiano({ provaConcessa: true, abbonamentiAttivi: false, ruolo: 'socio' }).prova).toBe(false)
  })
})
