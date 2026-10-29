import { describe, expect, it, vi } from 'vitest'
import type { IscrittoAttesa } from '../../../src/lib/listaAttesa'
import { TETTO_EMAIL_GIORNO } from '../../../src/lib/promemoriaEmail'
import { inviaCoda, inviaOfferteAttesa, righeDelGiro, righeDelMinuto, serviziAccesi, serviziConOperatore } from './inviaCoda'
import { buchiDaTombe } from './offerteAttesa'

const base = {
  id: '1',
  tipo: 'promemoria' as const,
  dogId: 'd',
  appointmentId: 'a',
  evento: 'e1',
  parteIl: '2020-01-01T00:00:00.000Z',
  stato: 'in_coda' as const,
  motivo: '',
  email: 'ada@cliente.it',
  nomeCane: 'Rex',
}

describe('inviaCoda', () => {
  it('senza chiave non spedisce e segna non_inviata solo se la posta manca, non se manca l’email', async () => {
    const esito = await inviaCoda({
      apiKey: '',
      righe: [{ ...base, email: '' , motivo: 'manca_email' }, { ...base, id: '2', evento: 'e2' }],
      emailOggi: 0,
    })
    expect(esito.inviate).toBe(0)
    expect(esito.riprova).toEqual(['2'])
    expect(esito.attese).toEqual(['1'])
  })

  it('con la chiave il posto libero apre la prenotazione e in fondo c’è il silenzio', async () => {
    const fetchImpl = vi.fn(async () => new Response('{"messageId":"1"}', { status: 201 }))
    const esito = await inviaCoda({
      apiKey: 'x',
      salonId: 'salone-1',
      replyTo: { email: 'sala@salone.it', name: 'I Pelosetti' },
      righe: [{
        ...base,
        tipo: 'attesa',
        url: 'https://groomlyapp.it/s/i-pelosetti?giorno=2026-10-28&ora=10:00',
      }],
      emailOggi: 0,
      fetchImpl,
    })
    expect(esito.inviate).toBe(1)
    expect(esito.token[0]?.token).toMatch(/^[A-Za-z0-9_-]{16,128}$/)
    const init = fetchImpl.mock.calls[0][1] as RequestInit
    const body = JSON.parse(String(init.body)) as { htmlContent: string; replyTo?: { email: string } }
    const html = body.htmlContent.replaceAll('&amp;', '&')
    expect(html).toContain('https://groomlyapp.it/s/i-pelosetti?giorno=2026-10-28&ora=10:00')
    expect(html).toContain('Non voglio più ricevere queste email')
    expect(html).toContain('/azione?mode=silenzio')
    expect(html).toContain('salon=salone-1')
    expect(html).toContain(esito.token[0].token)
    expect(body.replyTo?.email).toBe('sala@salone.it')
  })

  it('senza replyTo la posta parte senza rispondi-a', async () => {
    const fetchImpl = vi.fn(async () => new Response('{"messageId":"1"}', { status: 201 }))
    await inviaCoda({
      apiKey: 'x',
      salonId: 'salone-1',
      righe: [base],
      emailOggi: 0,
      fetchImpl,
    })
    const init = fetchImpl.mock.calls[0][1] as RequestInit
    const body = JSON.parse(String(init.body)) as { replyTo?: unknown; htmlContent: string }
    expect(body.replyTo).toBeUndefined()
    expect(body.htmlContent).toContain('Non voglio più ricevere queste email')
  })

  it('a 300 email oggi non chiama la rete', async () => {
    const fetchImpl = vi.fn(async () => new Response('{"messageId":"1"}', { status: 201 }))
    const esito = await inviaCoda({
      apiKey: 'x',
      righe: [base],
      emailOggi: 300,
      fetchImpl,
    })
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(esito.inviate).toBe(0)
    expect(esito.riprova).toEqual([])
    expect(esito.attese).toEqual([])
  })

  it('pagina assente resta in attesa e la rete non parte', async () => {
    const fetchImpl = vi.fn(async () => new Response('{"messageId":"1"}', { status: 201 }))
    const esito = await inviaCoda({
      apiKey: 'x',
      righe: [{ ...base, motivo: 'pagina_assente' }],
      emailOggi: 0,
      fetchImpl,
    })
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(esito.attese).toEqual(['1'])
    expect(esito.inviate).toBe(0)
  })

  it('una riga manuale non parte in questo giro', async () => {
    const fetchImpl = vi.fn(async () => new Response('{"messageId":"1"}', { status: 201 }))
    const esito = await inviaCoda({
      apiKey: 'x',
      righe: [{ ...base, parteIl: null }],
      emailOggi: 0,
      fetchImpl,
    })
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(esito.inviate).toBe(0)
    expect(esito.riprova).toEqual([])
  })

  it('subito spedisce la riga scelta anche se parteIl è vuoto', async () => {
    const fetchImpl = vi.fn(async () => new Response('{"messageId":"1"}', { status: 201 }))
    const esito = await inviaCoda({
      apiKey: 'x',
      subito: true,
      salonId: 'salone-1',
      righe: [{ ...base, parteIl: null }],
      emailOggi: 0,
      fetchImpl,
    })
    expect(fetchImpl).toHaveBeenCalledOnce()
    expect(esito.inviate).toBe(1)
  })

  it('il promemoria saluta chi accompagna il cane e mette il giorno', async () => {
    const fetchImpl = vi.fn(async () => new Response('{"messageId":"1"}', { status: 201 }))
    const inizio = '2026-11-04T09:00:00.000Z'
    await inviaCoda({
      apiKey: 'x',
      lingua: 'it',
      replyTo: { email: 'sala@salone.it', name: 'Canespa' },
      righe: [{ ...base, nomeCliente: 'Giulia', nomeCane: 'Rex', inizio }],
      emailOggi: 0,
      fetchImpl,
    })
    const init = fetchImpl.mock.calls[0][1] as RequestInit
    const body = JSON.parse(String(init.body)) as { htmlContent: string; replyTo?: { email: string } }
    expect(body.htmlContent).toContain('Ciao Giulia')
    expect(body.htmlContent).toContain('Rex, Mercoledì 4 novembre alle 10:00')
    expect(body.replyTo?.email).toBe('sala@salone.it')
  })

  it('una data illeggibile non ferma il promemoria successivo', async () => {
    const fetchImpl = vi.fn(async () => new Response('{"messageId":"1"}', { status: 201 }))
    await inviaCoda({
      apiKey: 'x',
      lingua: 'it',
      righe: [
        { ...base, inizio: 'non-e-una-data' },
        { ...base, id: '2', evento: 'e2', inizio: '2026-11-04T09:00:00.000Z' },
      ],
      emailOggi: 0,
      fetchImpl,
    })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    const prima = JSON.parse(String((fetchImpl.mock.calls[0][1] as RequestInit).body)) as { htmlContent: string }
    expect(prima.htmlContent).not.toContain('alle ')
  })

  it('una riga vecchia senza nome e senza inizio parte lo stesso', async () => {
    const fetchImpl = vi.fn(async () => new Response('{"messageId":"1"}', { status: 201 }))
    await inviaCoda({
      apiKey: 'x',
      lingua: 'it',
      replyTo: { email: 'sala@salone.it', name: 'Canespa' },
      righe: [base],
      emailOggi: 0,
      fetchImpl,
    })
    const init = fetchImpl.mock.calls[0][1] as RequestInit
    const body = JSON.parse(String(init.body)) as { htmlContent: string }
    expect(body.htmlContent).toContain('Ciao,')
    expect(body.htmlContent).not.toContain('nel promemoria')
  })

  it('senza replyTo non invita a rispondere e usa il nome del profilo', async () => {
    const fetchImpl = vi.fn(async () => new Response('{"messageId":"1"}', { status: 201 }))
    await inviaCoda({
      apiKey: 'x',
      lingua: 'it',
      salone: 'Canespa',
      righe: [{ ...base, nomeCliente: 'Giulia', nomeCane: 'Rex' }],
      emailOggi: 0,
      fetchImpl,
    })
    const init = fetchImpl.mock.calls[0][1] as RequestInit
    const body = JSON.parse(String(init.body)) as { htmlContent: string; replyTo?: unknown }
    expect(body.replyTo).toBeUndefined()
    expect(body.htmlContent).not.toContain('rispondi a questa email')
    expect(body.htmlContent).toContain('Canespa ti ricorda')
  })

  it('se il rispondi-a si chiama Groomly usa il nome del profilo', async () => {
    const fetchImpl = vi.fn(async () => new Response('{"messageId":"1"}', { status: 201 }))
    await inviaCoda({
      apiKey: 'x',
      lingua: 'it',
      salone: 'Canespa',
      replyTo: { email: 'sala@salone.it', name: 'Groomly' },
      righe: [{ ...base, nomeCliente: 'Giulia', nomeCane: 'Rex' }],
      emailOggi: 0,
      fetchImpl,
    })
    const init = fetchImpl.mock.calls[0][1] as RequestInit
    const body = JSON.parse(String(init.body)) as { htmlContent: string; replyTo?: { email: string } }
    expect(body.htmlContent).toContain('Canespa ti ricorda')
    expect(body.htmlContent).not.toContain('Groomly ti ricorda')
    expect(body.replyTo?.email).toBe('sala@salone.it')
  })

  it('il minuto copia il nome del cliente dal cane e l’inizio della visita', () => {
    const start = new Date('2026-11-04T09:00:00.000Z')
    const nate = righeDelMinuto({
      adesso: new Date('2026-10-28T09:00:00.000Z'),
      servizi: { promemoria: { modo: 'automatico', anticipoGiorni: 1, ora: '18:00' } },
      esistenti: [],
      visite: [{ id: 'a', dogId: 'd', start, status: 'programmato', nomeCane: 'Rex', email: 'a@b.it' }],
      cani: [{ id: 'd', nome: 'Rex', nomeCliente: 'Giulia', email: 'a@b.it', attivo: true }],
      attesa: [],
      slug: '',
      linkRecensioni: '',
      proposte: [],
    })
    const riga = nate.righe.find((item) => item.tipo === 'promemoria')
    expect(riga?.nomeCliente).toBe('Giulia')
    expect(riga?.inizio).toBe(start.toISOString())
  })

  it('un servizio spento non entra nel giro e una non inviata si ripropone', () => {
    const pronte = righeDelGiro(
      [base, { ...base, id: 'p', tipo: 'pronto', evento: 'p' }, { ...base, id: 'n', evento: 'n', stato: 'non_inviata' }],
      ['promemoria'],
    )
    expect(pronte.map((riga) => riga.id)).toEqual(['1', 'n'])
    expect(pronte[1]?.stato).toBe('in_coda')
  })

  it('crea il promemoria e la recensione, e non crea più l’offerta della lista', () => {
    const nate = righeDelMinuto({
      adesso: new Date('2026-10-28T09:00:00.000Z'),
      servizi: {
        promemoria: { modo: 'automatico', anticipoGiorni: 1, ora: '18:00' },
        pronto: { modo: 'spento' },
        recensione: { modo: 'automatico' },
        attesa: { modo: 'automatico' },
      },
      esistenti: [
        { ...base, id: 'vecchia', tipo: 'pronto', evento: 'pronto:x', parteIl: '2020-01-01T00:00:00.000Z' },
        { ...base, id: 'offerta', tipo: 'attesa', evento: 'attesa:buco:w', stato: 'in_coda' },
        { ...base, id: 'gia', tipo: 'attesa', evento: 'attesa:inviata', stato: 'inviata' },
        { ...base, id: 'ferma', tipo: 'attesa', evento: 'attesa:ferma', stato: 'fermata', motivo: 'fermata' },
        { ...base, id: 'rete', tipo: 'attesa', evento: 'attesa:rete', stato: 'non_inviata', motivo: 'rete' },
      ],
      visite: [
        { id: 'a', dogId: 'd', start: new Date('2026-10-29T09:00:00.000Z'), status: 'programmato', nomeCane: 'Fido', email: 'a@b.it' },
        { id: 'fatta', dogId: 'd', start: new Date('2026-10-28T08:00:00.000Z'), status: 'completato', chiusoIl: '2026-10-28T08:00:00.000Z', nomeCane: 'Fido', email: 'a@b.it' },
        { id: 'buco', dogId: 'x', start: new Date('2026-10-28T09:00:00.000Z'), status: 'disdetto', nomeCane: 'X', email: '', minuti: 60 },
      ],
      cani: [{ id: 'd', nome: 'Fido', email: 'a@b.it', attivo: true }],
      attesa: [{ id: 'w', dogId: 'd', durataMin: 30, preferenza: 'qualsiasi', arrivato: '2026-10-01T00:00:00.000Z' }],
      slug: 'i-pelosetti',
      linkRecensioni: 'https://g.page/x',
      proposte: [],
    })
    expect(nate.accesi).toEqual(['promemoria', 'recensione', 'attesa'])
    expect(nate.daSpedire.some((riga) => riga.tipo === 'pronto')).toBe(false)
    expect(nate.righe.some((riga) => riga.tipo === 'promemoria' && riga.stato === 'in_coda')).toBe(true)
    expect(nate.righe.some((riga) => riga.tipo === 'recensione' && riga.stato === 'in_coda')).toBe(true)
    expect(nate.righe.filter((riga) => riga.tipo === 'attesa' && riga.stato === 'in_coda')).toEqual([])
    expect(nate.righe.find((riga) => riga.id === 'offerta')?.stato).toBe('chiusa')
    expect(nate.righe.find((riga) => riga.id === 'rete')?.stato).toBe('chiusa')
    expect(nate.righe.find((riga) => riga.id === 'gia')?.stato).toBe('inviata')
    expect(nate.righe.find((riga) => riga.id === 'ferma')?.stato).toBe('fermata')
  })
})

const iscrittoBase: IscrittoAttesa = {
  id: 'i1',
  nome: 'Giulia',
  phone: '333',
  email: 'giulia@cliente.it',
  nomeCane: 'Rex',
  specie: 'cane',
  taglia: 'media',
  servizioId: 's',
  trattamento: 'Bagno',
  durataMin: 60,
  creatoIl: '2026-10-01T00:00:00.000Z',
}

function minutoAttesa(over: {
  status: string
  start: string
  adesso: string
  iscritti?: IscrittoAttesa[]
  offerte?: { id: string; inviataIl: string | null }[]
  slug?: string
  modo?: 'manuale' | 'automatico' | 'spento'
  updatedAt?: string
  altre?: { id: string; start: string; status: string; minuti?: number }[]
}) {
  return righeDelMinuto({
    adesso: new Date(over.adesso),
    servizi: { attesa: { modo: over.modo ?? 'automatico' } },
    esistenti: [],
    visite: [
      { id: 'v1', dogId: 'd', start: new Date(over.start), status: over.status, nomeCane: 'Fido', email: 'a@b.it', ...(over.updatedAt ? { updatedAt: new Date(over.updatedAt) } : {}) },
      ...(over.altre ?? []).map((altra) => ({ id: altra.id, dogId: 'd', start: new Date(altra.start), status: altra.status, nomeCane: 'Fido', email: 'a@b.it', minuti: altra.minuti })),
    ],
    cani: [{ id: 'd', nome: 'Fido', email: 'a@b.it', attivo: true }],
    attesa: [],
    slug: over.slug ?? 'i-pelosetti',
    linkRecensioni: '',
    proposte: [],
    iscritti: over.iscritti ?? [iscrittoBase],
    offerte: over.offerte ?? [],
    tokenDi: () => 'ab'.repeat(32),
  })
}

describe('righeDelMinuto, offerte della lista d’attesa', () => {
  const START = '2026-11-04T09:00:00.000Z'

  it('una visita non venuta con l’ora già passata non crea offerte', () => {
    const nate = minutoAttesa({ status: 'non_venuto', start: START, adesso: '2026-11-04T15:00:00.000Z' })
    expect(nate.offerteAttesa).toEqual([])
  })

  it('una visita disdetta con l’ora davanti crea un documento per ogni iscritto', () => {
    const nate = minutoAttesa({
      status: 'disdetto',
      start: START,
      adesso: '2026-11-04T08:00:00.000Z',
      iscritti: [iscrittoBase, { ...iscrittoBase, id: 'i2', email: 'altro@cliente.it' }],
    })
    const token = 'ab'.repeat(32)
    expect(nate.offerteAttesa).toEqual([
      { id: 'attesa:v1:i1', token, appointmentId: 'v1', iscrittoId: 'i1', inizio: START, inviataIl: null, url: `https://groomlyapp.it/s/i-pelosetti?attesa=${token}` },
      { id: 'attesa:v1:i2', token, appointmentId: 'v1', iscrittoId: 'i2', inizio: START, inviataIl: null, url: `https://groomlyapp.it/s/i-pelosetti?attesa=${token}` },
    ])
  })

  it('una visita non venuta con l’ora ancora davanti è un buco', () => {
    const nate = minutoAttesa({ status: 'non_venuto', start: START, adesso: '2026-11-04T08:00:00.000Z' })
    expect(nate.offerteAttesa.map((offerta) => offerta.id)).toEqual(['attesa:v1:i1'])
  })

  it('una visita completata o programmata non è un buco, nemmeno con l’ora davanti', () => {
    expect(minutoAttesa({ status: 'completato', start: START, adesso: '2026-11-04T08:00:00.000Z' }).offerteAttesa).toEqual([])
    expect(minutoAttesa({ status: 'programmato', start: START, adesso: '2026-11-04T08:00:00.000Z' }).offerteAttesa).toEqual([])
  })

  it('un buco già coperto da un’altra visita programmata non si offre a nessuno', () => {
    const adesso = '2026-11-04T08:00:00.000Z'
    // la disdetta parte alle 09:00, l'altra visita copre dalle 08:30 alle 09:30
    const dentro = minutoAttesa({ status: 'disdetto', start: START, adesso, altre: [{ id: 'v2', start: '2026-11-04T08:30:00.000Z', status: 'programmato', minuti: 60 }] })
    expect(dentro.offerteAttesa).toEqual([])
    // l'inizio coincide con la fine dell'altra visita: il posto è libero
    const fine = minutoAttesa({ status: 'disdetto', start: START, adesso, altre: [{ id: 'v2', start: '2026-11-04T08:00:00.000Z', status: 'programmato', minuti: 60 }] })
    expect(fine.offerteAttesa.map((offerta) => offerta.id)).toEqual(['attesa:v1:i1'])
    // minuti 0 non copre nulla, salvo lo stesso inizio esatto
    const zero = minutoAttesa({ status: 'disdetto', start: START, adesso, altre: [{ id: 'v2', start: '2026-11-04T08:30:00.000Z', status: 'programmato', minuti: 0 }] })
    expect(zero.offerteAttesa.map((offerta) => offerta.id)).toEqual(['attesa:v1:i1'])
    const esatto = minutoAttesa({ status: 'disdetto', start: START, adesso, altre: [{ id: 'v2', start: START, status: 'programmato', minuti: 0 }] })
    expect(esatto.offerteAttesa).toEqual([])
    // una visita non programmata (completata, disdetta) non occupa il posto
    const altroStato = minutoAttesa({ status: 'disdetto', start: START, adesso, altre: [{ id: 'v2', start: '2026-11-04T08:30:00.000Z', status: 'completato', minuti: 60 }] })
    expect(altroStato.offerteAttesa.map((offerta) => offerta.id)).toEqual(['attesa:v1:i1'])
  })

  it('un buco di cancellazione già coperto non si offre, ma uno spostato ignora la propria visita', () => {
    const adesso = new Date('2026-11-04T08:00:00.000Z')
    const comune = {
      adesso,
      servizi: { attesa: { modo: 'automatico' } },
      esistenti: [],
      cani: [],
      attesa: [],
      slug: 'i-pelosetti',
      linkRecensioni: '',
      proposte: [],
      iscritti: [iscrittoBase],
      offerte: [],
      tokenDi: () => 'ab'.repeat(32),
    }
    const buco = { appointmentId: 'gone', inizio: new Date(START), nomeCaneDisdetto: 'Luna' }
    const coperto = righeDelMinuto({
      ...comune,
      visite: [{ id: 'v2', dogId: 'd', start: new Date(START), status: 'programmato', nomeCane: 'Fido', minuti: 45 }],
      buchi: [buco],
    })
    expect(coperto.offerteAttesa).toEqual([])
    const spostato = righeDelMinuto({
      ...comune,
      visite: [{ id: 'gone', dogId: 'd', start: new Date('2026-11-04T10:00:00.000Z'), status: 'programmato', nomeCane: 'Luna', minuti: 60 }],
      buchi: [buco],
    })
    expect(spostato.offerteAttesa.map((offerta) => offerta.id)).toEqual(['attesa:gone:i1'])
  })

  it('chi si è iscritto dopo l’aggiornamento della disdetta non riceve l’offerta, chi c’era prima sì', () => {
    const nate = minutoAttesa({
      status: 'disdetto',
      start: START,
      adesso: '2026-11-04T08:00:00.000Z',
      updatedAt: '2026-11-01T12:00:00.000Z',
      iscritti: [
        { ...iscrittoBase, id: 'prima', creatoIl: '2026-11-01T11:59:59.000Z' },
        { ...iscrittoBase, id: 'pari', creatoIl: '2026-11-01T12:00:00.000Z' },
        { ...iscrittoBase, id: 'dopo', creatoIl: '2026-11-01T12:00:01.000Z' },
      ],
    })
    expect(nate.offerteAttesa.map((offerta) => offerta.iscrittoId)).toEqual(['prima', 'pari'])
  })

  it('senza updatedAt nessuno è escluso per l’iscrizione', () => {
    const nate = minutoAttesa({
      status: 'disdetto',
      start: START,
      adesso: '2026-11-04T08:00:00.000Z',
      iscritti: [{ ...iscrittoBase, id: 'tardi', creatoIl: '2026-11-03T00:00:00.000Z' }],
    })
    expect(nate.offerteAttesa.map((offerta) => offerta.iscrittoId)).toEqual(['tardi'])
  })

  it('il segno lasciato ha creatoIl: chi si è iscritto dopo non riceve l’offerta, un segno vecchio senza creatoIl non esclude nessuno', () => {
    const comune = {
      adesso: new Date('2026-11-04T08:00:00.000Z'),
      servizi: { attesa: { modo: 'automatico' } },
      esistenti: [],
      visite: [],
      cani: [],
      attesa: [],
      slug: 'i-pelosetti',
      linkRecensioni: '',
      proposte: [],
      iscritti: [
        { ...iscrittoBase, id: 'prima', creatoIl: '2026-11-01T11:00:00.000Z' },
        { ...iscrittoBase, id: 'dopo', creatoIl: '2026-11-01T13:00:00.000Z' },
      ],
      offerte: [],
      tokenDi: () => 'ab'.repeat(32),
    }
    const conData = righeDelMinuto({
      ...comune,
      buchi: buchiDaTombe([{ id: 'x', data: { appointmentId: 'x', inizio: START, nomeCane: 'Luna', creatoIl: '2026-11-01T12:00:00.000Z' } }], comune.adesso),
    })
    expect(conData.offerteAttesa.map((offerta) => offerta.iscrittoId)).toEqual(['prima'])
    const vecchio = righeDelMinuto({
      ...comune,
      buchi: buchiDaTombe([{ id: 'x', data: { appointmentId: 'x', inizio: START, nomeCane: 'Luna' } }], comune.adesso),
    })
    expect(vecchio.offerteAttesa.map((offerta) => offerta.iscrittoId)).toEqual(['prima', 'dopo'])
  })

  it('un’offerta già inviata non si ricrea, una con inviataIl nullo resta da spedire con lo stesso token', () => {
    const inviata = minutoAttesa({
      status: 'disdetto',
      start: START,
      adesso: '2026-11-04T08:00:00.000Z',
      offerte: [{ id: 'attesa:v1:i1', inviataIl: '2026-11-04T07:00:00.000Z' }],
    })
    expect(inviata.offerteAttesa).toEqual([])
    const vecchioToken = 'cd'.repeat(32)
    const vecchioUrl = `https://groomlyapp.it/s/i-pelosetti?attesa=${vecchioToken}`
    const nonInviata = minutoAttesa({
      status: 'disdetto',
      start: START,
      adesso: '2026-11-04T08:00:00.000Z',
      offerte: [{ id: 'attesa:v1:i1', inviataIl: null, token: vecchioToken, url: vecchioUrl }],
    })
    expect(nonInviata.offerteAttesa).toEqual([
      { id: 'attesa:v1:i1', token: vecchioToken, appointmentId: 'v1', iscrittoId: 'i1', inizio: START, inviataIl: null, url: vecchioUrl },
    ])
  })

  it('un buco da cancellazione o spostamento conta come una disdetta, senza doppioni con la visita', () => {
    const buchi = [{ appointmentId: 'gone', inizio: new Date(START), nomeCaneDisdetto: 'Luna' }]
    const nate = righeDelMinuto({
      adesso: new Date('2026-11-04T08:00:00.000Z'),
      servizi: { attesa: { modo: 'automatico' } },
      esistenti: [],
      visite: [{ id: 'v1', dogId: 'd', start: new Date(START), status: 'disdetto', nomeCane: 'Fido' }],
      cani: [],
      attesa: [],
      slug: 'i-pelosetti',
      linkRecensioni: '',
      proposte: [],
      iscritti: [iscrittoBase],
      offerte: [],
      buchi: [...buchi, { appointmentId: 'v1', inizio: new Date(START), nomeCaneDisdetto: 'Fido' }],
      tokenDi: () => 'ab'.repeat(32),
    })
    expect(nate.offerteAttesa.map((offerta) => offerta.id).sort()).toEqual(['attesa:gone:i1', 'attesa:v1:i1'])
  })

  it('senza pagina pubblica o con la lista spenta non crea nulla', () => {
    expect(minutoAttesa({ status: 'disdetto', start: START, adesso: '2026-11-04T08:00:00.000Z', slug: '' }).offerteAttesa).toEqual([])
    expect(minutoAttesa({ status: 'disdetto', start: START, adesso: '2026-11-04T08:00:00.000Z', modo: 'spento' }).offerteAttesa).toEqual([])
  })

  it('il token di serie ha 64 caratteri esadecimali', () => {
    const nate = righeDelMinuto({
      adesso: new Date('2026-11-04T08:00:00.000Z'),
      servizi: { attesa: { modo: 'manuale' } },
      esistenti: [],
      visite: [{ id: 'v1', dogId: 'd', start: new Date(START), status: 'disdetto', nomeCane: 'Fido' }],
      cani: [],
      attesa: [],
      slug: 'i-pelosetti',
      linkRecensioni: '',
      proposte: [],
      iscritti: [iscrittoBase],
      offerte: [],
    })
    expect(nate.offerteAttesa[0]?.token).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe('inviaOfferteAttesa', () => {
  const adesso = new Date('2026-11-04T08:00:00.000Z')
  const offerta = {
    id: 'attesa:v1:i1',
    token: 'ab'.repeat(32),
    appointmentId: 'v1',
    iscrittoId: 'i1',
    inizio: '2026-11-04T09:00:00.000Z',
    inviataIl: null,
    url: `https://groomlyapp.it/s/i-pelosetti?attesa=${'ab'.repeat(32)}`,
  }

  it('manda il testo a ogni iscritto e segna inviataIl', async () => {
    const fetchImpl = vi.fn(async () => new Response('{"messageId":"1"}', { status: 201 }))
    const esito = await inviaOfferteAttesa({
      apiKey: 'x',
      offerte: [offerta],
      iscritti: [iscrittoBase],
      emailOggi: 0,
      salone: 'I Pelosetti',
      fetchImpl,
      adesso,
    })
    expect(esito.inviate).toBe(1)
    expect(esito.offerte[0]?.inviataIl).toBe(adesso.toISOString())
    const body = JSON.parse(String((fetchImpl.mock.calls[0][1] as RequestInit).body)) as { to: { email: string }[]; subject: string; htmlContent: string }
    expect(body.to[0]?.email).toBe('giulia@cliente.it')
    expect(body.subject).toBe('Si è liberato un posto')
    expect(body.htmlContent).toContain(offerta.url)
    expect(body.htmlContent).toContain('Affrettati, prima di perdere questa possibilità.')
  })

  it('in caso di errore, senza chiave o oltre il tetto lascia inviataIl nullo', async () => {
    const rotta = vi.fn(async () => new Response('no', { status: 500 }))
    const fallita = await inviaOfferteAttesa({ apiKey: 'x', offerte: [offerta], iscritti: [iscrittoBase], emailOggi: 0, fetchImpl: rotta, adesso })
    expect(fallita.inviate).toBe(0)
    expect(fallita.offerte[0]?.inviataIl).toBeNull()

    const senzaChiave = await inviaOfferteAttesa({ apiKey: '', offerte: [offerta], iscritti: [iscrittoBase], emailOggi: 0, adesso })
    expect(senzaChiave.inviate).toBe(0)
    expect(senzaChiave.offerte[0]?.inviataIl).toBeNull()

    const buona = vi.fn(async () => new Response('{}', { status: 201 }))
    const pieno = await inviaOfferteAttesa({ apiKey: 'x', offerte: [offerta], iscritti: [iscrittoBase], emailOggi: TETTO_EMAIL_GIORNO, fetchImpl: buona, adesso })
    expect(pieno.inviate).toBe(0)
    expect(buona).not.toHaveBeenCalled()
    expect(pieno.offerte[0]?.inviataIl).toBeNull()
  })

  it('scrive ogni offerta appena è partita, prima di mandare la successiva', async () => {
    const eventi: string[] = []
    const fetchImpl = vi.fn(async () => {
      eventi.push('invio')
      return new Response('{}', { status: 201 })
    })
    const altro = { ...iscrittoBase, id: 'i2', email: 'altro@cliente.it' }
    const seconda = { ...offerta, id: 'attesa:v1:i2', iscrittoId: 'i2' }
    const esito = await inviaOfferteAttesa({
      apiKey: 'x',
      offerte: [offerta, seconda],
      iscritti: [iscrittoBase, altro],
      emailOggi: 0,
      fetchImpl,
      adesso,
      salva: async (voce) => {
        eventi.push(`scrivi ${voce.id} ${voce.inviataIl}`)
      },
    })
    expect(esito.inviate).toBe(2)
    expect(eventi).toEqual([
      'invio',
      `scrivi attesa:v1:i1 ${adesso.toISOString()}`,
      'invio',
      `scrivi attesa:v1:i2 ${adesso.toISOString()}`,
    ])
  })

  it('se la scrittura fallisce il giro si ferma e il resto della lista non riceve la mail', async () => {
    const fetchImpl = vi.fn(async () => new Response('{}', { status: 201 }))
    const altro = { ...iscrittoBase, id: 'i2', email: 'altro@cliente.it' }
    const seconda = { ...offerta, id: 'attesa:v1:i2', iscrittoId: 'i2' }
    const esito = await inviaOfferteAttesa({
      apiKey: 'x',
      offerte: [offerta, seconda],
      iscritti: [iscrittoBase, altro],
      emailOggi: 0,
      fetchImpl,
      adesso,
      salva: async () => {
        throw new Error('firestore')
      },
    })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(esito.scritturaFallita).toBe(true)
    expect(esito.inviate).toBe(1)
  })

  it('un’offerta non partita non viene scritta dal ciclo di invio', async () => {
    const salva = vi.fn(async () => undefined)
    await inviaOfferteAttesa({ apiKey: 'x', offerte: [offerta], iscritti: [{ ...iscrittoBase, email: 'non-valida' }], emailOggi: 0, adesso, salva })
    expect(salva).not.toHaveBeenCalled()
  })

  it('parla nella lingua passata', async () => {
    const fetchImpl = vi.fn(async () => new Response('{}', { status: 201 }))
    await inviaOfferteAttesa({ apiKey: 'x', offerte: [offerta], iscritti: [iscrittoBase], emailOggi: 0, lingua: 'en', fetchImpl, adesso })
    const body = JSON.parse(String((fetchImpl.mock.calls[0][1] as RequestInit).body)) as { subject: string }
    expect(body.subject).toBe('A place has opened up')
  })
})

describe('interruttore dell’operatore', () => {
  it('una funzione spenta in Utenti spegne il servizio email anche se il salone lo tiene acceso', () => {
    const servizi = { promemoria: { modo: 'automatico', ora: '18:00' }, pronto: { modo: 'manuale' }, auguri: { modo: 'automatico' } }
    const dopo = serviziConOperatore(servizi, { promemoriaAuto: false, compleanno: true })
    expect(serviziAccesi(dopo)).toEqual(['pronto', 'auguri'])
    expect((dopo as Record<string, { ora?: string }>).promemoria.ora).toBe('18:00')
    expect(servizi.promemoria.modo).toBe('automatico')
  })

  it('senza funzioni scritte dall’operatore resta la scelta del salone', () => {
    const servizi = { recensione: { modo: 'automatico' }, attesa: { modo: 'automatico' } }
    expect(serviziConOperatore(servizi, undefined)).toBe(servizi)
    expect(serviziAccesi(serviziConOperatore(servizi, { recensioni: false, listaAttesa: false }))).toEqual([])
  })
})
