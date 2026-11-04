import { describe, expect, it } from 'vitest'
import type { InvitoBeta } from './betaInvito'
import {
  contatoriDi,
  estensioniDi,
  daFareOggi,
  feedbackBetaDi,
  filtraSaloni,
  perchePiano,
  riepilogoFeedback,
  salonRows,
  statoBetaDi,
  vociAvvisami,
  type FeedbackLetto,
  type RigaLista,
  type SalonRow,
} from './adminManager'

const ADESSO = new Date('2026-11-04T10:00:00.000Z')

function invito(parziale: Partial<InvitoBeta> & { salonId: string }): InvitoBeta {
  return {
    piano: 'pro',
    giorni: 60,
    messaggio: null,
    stato: 'invitato',
    invitatoIl: '2026-11-01T10:00:00.000Z',
    scadeInvitoIl: '2026-11-15T10:00:00.000Z',
    rispostoIl: null,
    motivoRifiuto: null,
    altroRifiuto: null,
    revocatoIl: null,
    invitatoDa: 'op@groomly.it',
    aggiornatoIl: '2026-11-01T10:00:00.000Z',
    ...parziale,
  }
}

function riga(salonId: string, parziale: Partial<SalonRow> = {}): SalonRow {
  return { salonId, ownerName: `T ${salonId}`, salonName: `S ${salonId}`, livello: 'base', fonte: null, traccia: {}, ...parziale }
}

function feedback(parziale: Partial<FeedbackLetto> & { id: string; salonId: string }): FeedbackLetto {
  return {
    uid: 'u', piano: 'pro', voto: 4, funzioni: {}, nonVa: '', manca: '', pagheresti: 'si', quanto: '5-10',
    ricontatto: false, fineBeta: false, versioneApp: '1.1.188', creatoIl: '2026-11-03T10:00:00.000Z',
    ...parziale,
  }
}

describe('salonRows', () => {
  it('esclude shared, id vuoti o con barra, e porta la traccia beta', () => {
    const rows = salonRows({
      accountCount: 3,
      salonCount: 2,
      entries: [{ uid: 'ada', ownerName: 'Ada', salonName: 'Bauci' }],
      pro: [
        { uid: 'ada', salonId: 'ada', enabled: true, livello: 'pro', traccia: { betaFinoAl: '2026-12-01T00:00:00.000Z' } },
        { uid: 'x', salonId: 'shared', enabled: false },
        { uid: 'y', salonId: '  ', enabled: false },
        { uid: 'z', salonId: 'a/b', enabled: false },
      ],
    }, 'Senza nome')
    expect(rows.map((r) => r.salonId)).toEqual(['ada'])
    expect(rows[0].traccia.betaFinoAl).toBe('2026-12-01T00:00:00.000Z')
  })
})

describe('statoBetaDi', () => {
  it('distingue in beta, invitato, chiuso e mai', () => {
    expect(statoBetaDi(undefined, riga('a'), ADESSO)).toBe('mai')
    expect(statoBetaDi(invito({ salonId: 'a' }), riga('a'), ADESSO)).toBe('invitato')
    expect(statoBetaDi(invito({ salonId: 'a', scadeInvitoIl: '2026-11-01T00:00:00.000Z' }), riga('a'), ADESSO)).toBe('chiuso')
    expect(statoBetaDi(invito({ salonId: 'a', stato: 'rifiutato' }), riga('a'), ADESSO)).toBe('chiuso')
    const inBeta = riga('a', { traccia: { betaFinoAl: '2026-12-01T00:00:00.000Z' } })
    expect(statoBetaDi(invito({ salonId: 'a', stato: 'accettato' }), inBeta, ADESSO)).toBe('in-beta')
    const finita = riga('a', { traccia: { betaFinoAl: '2026-11-01T00:00:00.000Z' } })
    expect(statoBetaDi(invito({ salonId: 'a', stato: 'accettato' }), finita, ADESSO)).toBe('chiuso')
  })
})

describe('filtraSaloni', () => {
  const righe: RigaLista[] = [
    { row: riga('a', { salonName: 'Bàuci', ownerName: 'Ada' }), livello: 'pro', beta: 'in-beta', info: { citta: 'Perugia', ultimaAttivita: '2026-11-03T00:00:00.000Z' } },
    { row: riga('b', { salonName: 'Pelo', ownerName: 'Leo' }), livello: 'base', beta: 'mai', info: { ultimaAttivita: '2026-09-01T00:00:00.000Z' } },
    { row: riga('c', { salonName: 'Zampa', ownerName: 'Eva' }), livello: 'salone', beta: 'invitato', info: {} },
  ]
  const nessuno = { testo: '', piani: [], beta: [], attivita: [] }

  it('cerca senza accenti in nome, titolare e città', () => {
    expect(filtraSaloni(righe, { ...nessuno, testo: 'bauci' }, ADESSO).map((r) => r.row.salonId)).toEqual(['a'])
    expect(filtraSaloni(righe, { ...nessuno, testo: 'perugia' }, ADESSO).map((r) => r.row.salonId)).toEqual(['a'])
    expect(filtraSaloni(righe, { ...nessuno, testo: 'eva' }, ADESSO).map((r) => r.row.salonId)).toEqual(['c'])
  })

  it('combina i gruppi in E e i valori dello stesso gruppo in O', () => {
    expect(filtraSaloni(righe, { ...nessuno, piani: ['pro', 'base'] }, ADESSO).map((r) => r.row.salonId)).toEqual(['a', 'b'])
    expect(filtraSaloni(righe, { ...nessuno, piani: ['pro', 'base'], beta: ['mai'] }, ADESSO).map((r) => r.row.salonId)).toEqual(['b'])
  })

  it('attivi a 7 giorni e inattivi oltre 30 giorni', () => {
    expect(filtraSaloni(righe, { ...nessuno, attivita: ['attivi7'] }, ADESSO).map((r) => r.row.salonId)).toEqual(['a'])
    expect(filtraSaloni(righe, { ...nessuno, attivita: ['inattivi'] }, ADESSO).map((r) => r.row.salonId)).toEqual(['b'])
  })
})

describe('daFareOggi', () => {
  it('mette prima le scadenze più vicine, poi feedback e suggerimenti, al massimo 5', () => {
    const voci = daFareOggi({
      inviti: [
        invito({ salonId: 'a', scadeInvitoIl: '2026-11-06T10:00:00.000Z' }),
        invito({ salonId: 'b', scadeInvitoIl: '2026-11-30T10:00:00.000Z' }),
        invito({ salonId: 'c', stato: 'accettato' }),
      ],
      fineBeta: { c: '2026-11-05T10:00:00.000Z' },
      feedback: [feedback({ id: 'f1', salonId: 'a' }), feedback({ id: 'f2', salonId: 'b', creatoIl: '2026-10-01T00:00:00.000Z' })],
      feedbackVisti: new Set(),
      suggerimentiDaVedere: 3,
    }, ADESSO)
    expect(voci.map((v) => v.tipo)).toEqual(['beta-finisce', 'invito-scade', 'feedback', 'suggerimenti'])
    expect(voci[1]).toMatchObject({ salonId: 'a', giorni: 2 })
  })

  it('salta i feedback già visti e si ferma a 5 righe', () => {
    const inviti = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => invito({ salonId: id, scadeInvitoIl: '2026-11-06T10:00:00.000Z' }))
    const voci = daFareOggi({ inviti, fineBeta: {}, feedback: [feedback({ id: 'f1', salonId: 'a' })], feedbackVisti: new Set(['f1']), suggerimentiDaVedere: 0 }, ADESSO)
    expect(voci).toHaveLength(5)
    expect(voci.every((v) => v.tipo === 'invito-scade')).toBe(true)
  })
})

describe('perchePiano', () => {
  it('spiega VIP, beta, prova, play, manuale e Go', () => {
    expect(perchePiano(riga('a', { fonte: 'omaggio' }), 'vip').tipo).toBe('vip')
    expect(perchePiano(riga('a'), 'base').tipo).toBe('go')
    expect(perchePiano(riga('a', { fonte: 'beta', traccia: { betaDal: 'd', betaFinoAl: 'f' } }), 'pro')).toEqual({ tipo: 'beta', dal: 'd', fino: 'f' })
    expect(perchePiano(riga('a', { fonte: 'prova', scadeIl: 'x' }), 'pro')).toEqual({ tipo: 'prova', fino: 'x' })
    expect(perchePiano(riga('a', { fonte: 'play' }), 'salone').tipo).toBe('play')
    expect(perchePiano(riga('a', { fonte: null }), 'salone').tipo).toBe('manuale')
  })
})

describe('estensioniDi', () => {
  it('legge le estensioni di B1 e scarta quelle malformate', () => {
    expect(estensioniDi({ estensioni: [{ il: 'a', giorni: 30, scadeIl: 'b' }, { il: 'x' }, null] })).toEqual([{ il: 'a', giorni: 30, scadeIl: 'b' }])
    expect(estensioniDi({})).toEqual([])
  })
})

describe('feedbackBetaDi', () => {
  it('legge un feedback valido e scarta quelli malformati', () => {
    const buono = { salonId: 's', uid: 'u', piano: 'pro', voto: 5, funzioni: { export: 'utile', boh: 'utile', team: 'forse' }, nonVa: 'x', manca: '', pagheresti: 'forse', quanto: '10-20', ricontatto: true, fineBeta: false, versioneApp: '1', creatoIl: '2026-11-03T10:00:00.000Z' }
    const letto = feedbackBetaDi('id1', buono)
    expect(letto).toMatchObject({ id: 'id1', voto: 5, quanto: '10-20', ricontatto: true })
    expect(letto?.funzioni).toEqual({ export: 'utile' })
    expect(feedbackBetaDi('x', { ...buono, voto: 6 })).toBeNull()
    expect(feedbackBetaDi('x', { ...buono, pagheresti: 'magari' })).toBeNull()
    expect(feedbackBetaDi('x', { ...buono, salonId: '' })).toBeNull()
    expect(feedbackBetaDi('x', null)).toBeNull()
  })
})

describe('riepilogoFeedback', () => {
  it('fa media, distribuzione, pagheresti, fasce e giudizi per funzione', () => {
    const r = riepilogoFeedback([
      feedback({ id: '1', salonId: 'a', voto: 5, funzioni: { export: 'utile' } }),
      feedback({ id: '2', salonId: 'b', voto: 3, pagheresti: 'no', quanto: null, funzioni: { export: 'non-usata' } }),
    ])
    expect(r.totale).toBe(2)
    expect(r.media).toBe(4)
    expect(r.voti[5]).toBe(1)
    expect(r.voti[3]).toBe(1)
    expect(r.pagheresti).toEqual({ si: 1, forse: 0, no: 1 })
    expect(r.quanto['5-10']).toBe(1)
    expect(r.funzioni.export).toEqual({ utile: 1, 'poco-utile': 0, 'non-usata': 1 })
    expect(riepilogoFeedback([]).media).toBeNull()
  })
})

describe('contatoriDi e vociAvvisami', () => {
  it('legge i contatori in modo difensivo con il campo facoltativo per salone', () => {
    const c = contatoriDi({
      saloni: { totali: 18, attivi7: 12, attivi30: 16 },
      perPiano: { base: 9, pro: 5, salone: 2, vip: 1, altro: 3 },
      perFonte: { beta: 5, prova: 1 },
      inviti: { invitato: 3 },
      avvisami: { prenotazioni: 6, 'piano-salone': 2, team: 'x' },
      feedback: { totali: 4, pagheresti: { si: 2 } },
      perSalone: { a: { ultimaAttivita: '2026-11-03T00:00:00.000Z', citta: 'Bari' }, b: 'no' },
    })
    expect(c.saloni).toEqual({ totali: 18, attivi7: 12, attivi30: 16 })
    expect(c.perPiano).toEqual({ base: 9, pro: 5, salone: 2, vip: 1 })
    expect(c.perFonte.manuale).toBe(0)
    expect(c.inviti.rifiutato).toBe(0)
    expect(c.avvisami).toEqual({ prenotazioni: 6, 'piano-salone': 2 })
    expect(c.feedback.pagheresti).toEqual({ si: 2, forse: 0, no: 0 })
    expect(c.perSalone).toEqual({ a: { ultimaAttivita: '2026-11-03T00:00:00.000Z', citta: 'Bari' } })
    expect(c.inBeta).toBeNull()
    expect(contatoriDi(null).saloni.totali).toBe(0)
    expect(contatoriDi({}).perSalone).toBeNull()
  })

  it('legge inBeta e ultimoAccesso di B1 come attività per salone', () => {
    const c = contatoriDi({ inBeta: 4, ultimoAccesso: { a: '2026-11-03T00:00:00.000Z', b: null, c: 'boh' } })
    expect(c.inBeta).toBe(4)
    expect(c.perSalone).toEqual({ a: { ultimaAttivita: '2026-11-03T00:00:00.000Z' }, b: {}, c: {} })
  })

  it('ordina gli Avvisami dal più chiesto, massimo 6, col piano di ogni funzione', () => {
    const voci = vociAvvisami({ prenotazioni: 6, team: 3, 'piano-plus': 1, export: 2, fedelta: 1, drive: 1, pronto: 1, richiamo: 1 })
    expect(voci).toHaveLength(6)
    expect(voci[0]).toEqual({ chiave: 'prenotazioni', n: 6, piano: 'plus' })
    expect(voci[1]).toEqual({ chiave: 'team', n: 3, piano: 'salone' })
    expect(vociAvvisami({ 'piano-salone': 2 })[0].piano).toBe('salone')
  })
})
